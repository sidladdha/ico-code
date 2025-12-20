// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract AssetBackedToken is ERC20, AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    
    struct AssetBatch {
        uint256 batchId;
        uint256 totalTokens;
        string assetProof;
        bool adminVerified;
        bool tokensIssued;
        uint256 timestamp;
    }
    
    mapping(uint256 => AssetBatch) public assetBatches;
    uint256 public currentBatchId;
    
    // Distribution percentages (basis points: 10000 = 100%)
    struct Distribution {
        address user1;
        address user2;
        address user3;
        address owner;
        uint256 user1Percent;  // 1000 = 10%
        uint256 user2Percent;  // 1800 = 18%
        uint256 user3Percent;  // 2500 = 25%
    }
    
    Distribution public distribution;
    
    event AssetSubmitted(uint256 indexed batchId, address indexed owner, uint256 amount, string assetProof);
    event AssetVerified(uint256 indexed batchId, address indexed admin);
    event TokensIssued(uint256 indexed batchId, uint256 totalAmount);
    event TokensDistributed(address indexed recipient, uint256 amount, uint256 percentage);
    
    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address owner,
        address _user1,
        address _user2,
        address _user3
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OWNER_ROLE, owner);
        
        // Set distribution
        distribution = Distribution({
            user1: _user1,
            user2: _user2,
            user3: _user3,
            owner: owner,
            user1Percent: 1000,  // 10%
            user2Percent: 1800,  // 18%
            user3Percent: 2500   // 25%
        });
    }
    
    // Owner submits asset proof for token issuance
    function submitAssetForTokenization(
        uint256 tokenAmount,
        string memory assetProof
    ) external onlyRole(OWNER_ROLE) returns (uint256) {
        currentBatchId++;
        
        assetBatches[currentBatchId] = AssetBatch({
            batchId: currentBatchId,
            totalTokens: tokenAmount,
            assetProof: assetProof,
            adminVerified: false,
            tokensIssued: false,
            timestamp: block.timestamp
        });
        
        emit AssetSubmitted(currentBatchId, msg.sender, tokenAmount, assetProof);
        return currentBatchId;
    }
    
    // Admin verifies the asset
    function verifyAsset(uint256 batchId) external onlyRole(ADMIN_ROLE) {
        require(!assetBatches[batchId].adminVerified, "Already verified");
        require(!assetBatches[batchId].tokensIssued, "Tokens already issued");
        
        assetBatches[batchId].adminVerified = true;
        emit AssetVerified(batchId, msg.sender);
    }
    
    // Owner issues tokens after admin verification
    function issueTokens(uint256 batchId) external onlyRole(OWNER_ROLE) {
        AssetBatch storage batch = assetBatches[batchId];
        require(batch.adminVerified, "Asset not verified by admin");
        require(!batch.tokensIssued, "Tokens already issued");
        
        uint256 totalTokens = batch.totalTokens * 10**decimals();
        
        // Calculate distributions
        uint256 user1Amount = (totalTokens * distribution.user1Percent) / 10000;
        uint256 user2Amount = (totalTokens * distribution.user2Percent) / 10000;
        uint256 user3Amount = (totalTokens * distribution.user3Percent) / 10000;
        uint256 ownerAmount = totalTokens - user1Amount - user2Amount - user3Amount;
        
        // Mint and distribute
        _mint(distribution.user1, user1Amount);
        _mint(distribution.user2, user2Amount);
        _mint(distribution.user3, user3Amount);
        _mint(distribution.owner, ownerAmount);
        
        batch.tokensIssued = true;
        
        emit TokensIssued(batchId, totalTokens);
        emit TokensDistributed(distribution.user1, user1Amount, distribution.user1Percent);
        emit TokensDistributed(distribution.user2, user2Amount, distribution.user2Percent);
        emit TokensDistributed(distribution.user3, user3Amount, distribution.user3Percent);
        emit TokensDistributed(distribution.owner, ownerAmount, 10000 - distribution.user1Percent - distribution.user2Percent - distribution.user3Percent);
    }
    
    // View functions
    function getAssetBatch(uint256 batchId) external view returns (AssetBatch memory) {
        return assetBatches[batchId];
    }
    
    function canIssueTokens(uint256 batchId) external view returns (bool) {
        return assetBatches[batchId].adminVerified && !assetBatches[batchId].tokensIssued;
    }
    
    // Pause functionality for emergencies
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}