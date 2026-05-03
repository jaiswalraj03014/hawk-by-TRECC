// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ONLY these three imports are allowed here
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Hawk is ERC4626, Ownable {
    mapping(address => uint256) public operatorBonds;
    mapping(address => bool) public approvedAgents;

    event BondPosted(address indexed operator, uint256 amount);
    event AgentRegistered(address indexed operator, address indexed agent);
    event BondSlashed(address indexed operator, uint256 amount);

    constructor(IERC20 _asset)
        ERC4626(_asset)
        ERC20("Hawk Senior Vault", "hawkUSDC")
        Ownable(msg.sender)
    {}

    function postBond() external payable {
        require(msg.value > 0, "Must post ETH bond");
        operatorBonds[msg.sender] += msg.value;
        emit BondPosted(msg.sender, msg.value);
    }

    function registerAgent(address agent) external {
        require(operatorBonds[msg.sender] >= 0.05 ether, "Bond too low to register agent");
        approvedAgents[agent] = true;
        emit AgentRegistered(msg.sender, agent);
    }

    function slashBond(address operator, uint256 amount) external onlyOwner {
        require(operatorBonds[operator] >= amount, "Slash amount exceeds bond");
        operatorBonds[operator] -= amount;
        emit BondSlashed(operator, amount);
    }
}