// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CampaignContract {
    address public creator;
    string public name;
    uint256 public goalAmount;

    constructor() {
        creator = msg.sender;
    }

    function initialize(string memory _name, uint256 _goalAmount) external {
        require(bytes(name).length == 0, "Already initialized");
        require(msg.sender == creator, "Only the creator can initialize");
        name = _name;
        goalAmount = _goalAmount;
    }
}

contract CampaignFactory {
    address[] public deployedCampaigns;

    function createCampaign(
        string memory _name,
        uint256 _goalAmount
    ) public returns (address newCampaignAddress) {
        // Load the creation code into memory in Solidity first
        bytes memory creationCode = type(CampaignContract).creationCode;

        assembly {
            newCampaignAddress := create(0, add(creationCode, 0x20), mload(creationCode))
            if iszero(newCampaignAddress) {
                // revert if deployment fails
                revert(0, 0)
            }
        }

        // Call initializer
        CampaignContract(newCampaignAddress).initialize(_name, _goalAmount);

        deployedCampaigns.push(newCampaignAddress);
        return newCampaignAddress;
    }

    function getCampaignAddress(uint256 _index) public view returns (address) {
        require(_index < deployedCampaigns.length, "Index out of bounds");
        return deployedCampaigns[_index];
    }
}
