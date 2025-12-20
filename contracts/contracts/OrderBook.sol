// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OrderBook is ReentrancyGuard {
    IERC20 public token;
    
    enum OrderType { BUY, SELL }
    enum OrderStatus { OPEN, FILLED, PARTIALLY_FILLED, CANCELLED }
    
    struct Order {
        uint256 orderId;
        address trader;
        OrderType orderType;
        uint256 price;  // Price in wei per token
        uint256 amount; // Amount in token smallest unit
        uint256 filled;
        OrderStatus status;
        uint256 timestamp;
    }
    
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;
    
    // Order book arrays (sorted by price)
    uint256[] public buyOrders;  // Sorted descending (highest first)
    uint256[] public sellOrders; // Sorted ascending (lowest first)
    
    event OrderPlaced(uint256 indexed orderId, address indexed trader, OrderType orderType, uint256 price, uint256 amount);
    event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 amount, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed trader);
    event TradeExecuted(address indexed buyer, address indexed seller, uint256 amount, uint256 price);
    
    constructor(address _token) {
        token = IERC20(_token);
    }
    
    function placeBuyOrder(uint256 price, uint256 amount) external payable nonReentrant returns (uint256) {
        require(price > 0, "Price must be positive");
        require(amount > 0, "Amount must be positive");
        require(msg.value >= price * amount / 1e18, "Insufficient ETH sent");
        
        uint256 orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            orderType: OrderType.BUY,
            price: price,
            amount: amount,
            filled: 0,
            status: OrderStatus.OPEN,
            timestamp: block.timestamp
        });
        
        buyOrders.push(orderId);
        _sortBuyOrders();
        
        emit OrderPlaced(orderId, msg.sender, OrderType.BUY, price, amount);
        
        // Try to match immediately
        _matchOrders();
        
        return orderId;
    }
    
    function placeSellOrder(uint256 price, uint256 amount) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be positive");
        require(amount > 0, "Amount must be positive");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient token balance");
        require(token.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        uint256 orderId = nextOrderId++;
        
        orders[orderId] = Order({
            orderId: orderId,
            trader: msg.sender,
            orderType: OrderType.SELL,
            price: price,
            amount: amount,
            filled: 0,
            status: OrderStatus.OPEN,
            timestamp: block.timestamp
        });
        
        sellOrders.push(orderId);
        _sortSellOrders();
        
        emit OrderPlaced(orderId, msg.sender, OrderType.SELL, price, amount);
        
        // Try to match immediately
        _matchOrders();
        
        return orderId;
    }
    
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.OPEN || order.status == OrderStatus.PARTIALLY_FILLED, "Cannot cancel");
        
        uint256 remainingAmount = order.amount - order.filled;
        
        if (order.orderType == OrderType.BUY) {
            // Refund ETH
            uint256 refund = (order.price * remainingAmount) / 1e18;
            payable(msg.sender).transfer(refund);
            _removeFromBuyOrders(orderId);
        } else {
            _removeFromSellOrders(orderId);
        }
        
        order.status = OrderStatus.CANCELLED;
        emit OrderCancelled(orderId, msg.sender);
    }
    
    function _matchOrders() private {
        if (buyOrders.length == 0 || sellOrders.length == 0) return;
        
        uint256 i = 0;
        while (i < buyOrders.length && sellOrders.length > 0) {
            uint256 buyOrderId = buyOrders[i];
            uint256 sellOrderId = sellOrders[0];
            
            Order storage buyOrder = orders[buyOrderId];
            Order storage sellOrder = orders[sellOrderId];
            
            // Check if orders can match
            if (buyOrder.price >= sellOrder.price && 
                buyOrder.status != OrderStatus.CANCELLED && 
                sellOrder.status != OrderStatus.CANCELLED) {
                
                uint256 buyRemaining = buyOrder.amount - buyOrder.filled;
                uint256 sellRemaining = sellOrder.amount - sellOrder.filled;
                uint256 matchAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
                
                // Execute trade at sell price
                uint256 tradePrice = sellOrder.price;
                uint256 ethAmount = (tradePrice * matchAmount) / 1e18;
                
                // Transfer tokens from seller to buyer
                require(token.transferFrom(sellOrder.trader, buyOrder.trader, matchAmount), "Token transfer failed");
                
                // Transfer ETH from contract to seller
                payable(sellOrder.trader).transfer(ethAmount);
                
                // Update orders
                buyOrder.filled += matchAmount;
                sellOrder.filled += matchAmount;
                
                if (buyOrder.filled >= buyOrder.amount) {
                    buyOrder.status = OrderStatus.FILLED;
                    _removeFromBuyOrders(buyOrderId);
                } else {
                    buyOrder.status = OrderStatus.PARTIALLY_FILLED;
                    i++;
                }
                
                if (sellOrder.filled >= sellOrder.amount) {
                    sellOrder.status = OrderStatus.FILLED;
                    _removeFromSellOrders(sellOrderId);
                } else {
                    sellOrder.status = OrderStatus.PARTIALLY_FILLED;
                }
                
                emit OrderMatched(buyOrderId, sellOrderId, matchAmount, tradePrice);
                emit TradeExecuted(buyOrder.trader, sellOrder.trader, matchAmount, tradePrice);
            } else {
                i++;
            }
        }
    }
    
    function _sortBuyOrders() private {
        // Simple bubble sort for descending order (highest price first)
        for (uint i = 0; i < buyOrders.length; i++) {
            for (uint j = i + 1; j < buyOrders.length; j++) {
                if (orders[buyOrders[i]].price < orders[buyOrders[j]].price) {
                    uint256 temp = buyOrders[i];
                    buyOrders[i] = buyOrders[j];
                    buyOrders[j] = temp;
                }
            }
        }
    }
    
    function _sortSellOrders() private {
        // Simple bubble sort for ascending order (lowest price first)
        for (uint i = 0; i < sellOrders.length; i++) {
            for (uint j = i + 1; j < sellOrders.length; j++) {
                if (orders[sellOrders[i]].price > orders[sellOrders[j]].price) {
                    uint256 temp = sellOrders[i];
                    sellOrders[i] = sellOrders[j];
                    sellOrders[j] = temp;
                }
            }
        }
    }
    
    function _removeFromBuyOrders(uint256 orderId) private {
        for (uint i = 0; i < buyOrders.length; i++) {
            if (buyOrders[i] == orderId) {
                buyOrders[i] = buyOrders[buyOrders.length - 1];
                buyOrders.pop();
                break;
            }
        }
    }
    
    function _removeFromSellOrders(uint256 orderId) private {
        for (uint i = 0; i < sellOrders.length; i++) {
            if (sellOrders[i] == orderId) {
                sellOrders[i] = sellOrders[sellOrders.length - 1];
                sellOrders.pop();
                break;
            }
        }
    }
    
    // View functions
    function getBuyOrders() external view returns (uint256[] memory) {
        return buyOrders;
    }
    
    function getSellOrders() external view returns (uint256[] memory) {
        return sellOrders;
    }
    
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
}