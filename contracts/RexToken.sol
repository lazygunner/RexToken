pragma solidity ^0.4.11;

import "zeppelin-solidity/contracts/token/SimpleToken.sol";
import "zeppelin-solidity/contracts/token/StandardToken.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './FinalizableToken.sol';

/****************************************************
Checklist
==========
* Make sure version string has no -debug
* Ensure ETH_RATE is up to date
* Ensure the cap is correct
* Double check all addresses
* Make sure migrate source address is correct
* StartTime = 1501516800
* Vault = 0x03e4B00B607d09811b0Fa61Cf636a6460861939F
*****************************************************/

contract RexToken is StandardToken, Ownable {

  function version() constant returns (bytes32) {
      return "0.1.2-debug";
  }

  string public constant name = "REX - Real Estate tokens";
  string public constant symbol = "REX";
  uint256 public constant decimals = 18;

  uint256 constant BASE_RATE = 700;
  uint256 constant ETH_RATE = 225; // TODO: update before deploying
  uint256 constant USD_RAISED_CAP = 27*10**6; // 30*10**6 = $30 Million USD
  uint256 constant ETHER_RAISED_CAP = USD_RAISED_CAP / ETH_RATE;
  uint256 public constant WEI_RAISED_CAP = ETHER_RAISED_CAP * 1 ether;
  uint256 constant DURATION = 4 weeks;

  // THERE ARE 6 OTHER STORAGE VARIABLES BEFORE THESE (NOTE CONSTANTS ABOVE DO NOT APPEAR IN LOCALSTORAGE INDEX)

  // final distribution addresses and shares
  // TODO: update before deploying 

  uint256 TOTAL_SHARE = 1000;
  uint256 CROWDSALE_SHARE = 500;

  address ANGELS_ADDRESS = 0x00998eba0E5B83018a0CFCdeCc5304f9f167d27a;
  uint256 ANGELS_SHARE = 50;

  address CORE_1_ADDRESS = 0x4aD48BE9bf6E2d35277Bd33C100D283C29C7951F;
  uint256 CORE_1_SHARE = 75;
  address CORE_2_ADDRESS = 0x2a62609c6A6bDBE25Da4fb05980e85db9A479C5e;
  uint256 CORE_2_SHARE = 75;

  address PARTNERSHIP_ADDRESS = 0x53B8fFBe35AE548f22d5a3b31D6E5e0C04f0d2DF;
  uint256 PARTNERSHIP_SHARE = 70;

  address REWARDS_ADDRESS = 0x43F1aa047D3241B7DD250EB37b25fc509085fDf9;
  uint256 REWARDS_SHARE = 200;

  address AFFILIATE_ADDRESS = 0x64ea62A8080eD1C2b8d996ACC7a82108975e5361;
  uint256 AFFILIATE_SHARE = 30;

  // state variables
  address vault;
  address previousToken;
  uint256 public startTime;
  uint256 public weiRaised;

  event TokenCreated(address indexed investor, uint256 amount);

  function RexToken(uint256 _start, address _vault, address _previousToken) {
    startTime = _start;
    vault = _vault;
    previousToken = _previousToken;
    isFinalized = false;
  }

  function () payable {
    createTokens(msg.sender);
  }

  function createTokens(address recipient) payable {
    if (tokenSaleOnHold) revert();
    if (msg.value == 0) revert();
    if (now < startTime) revert();
    if (now > startTime + DURATION) revert();

    uint256 weiAmount = msg.value;

    if (weiRaised >= WEI_RAISED_CAP) revert();

    //if funder sent more than the remaining amount then send them a refund of the difference
    if ((weiRaised + weiAmount) > WEI_RAISED_CAP) {
      weiAmount = WEI_RAISED_CAP - weiRaised;
      if (!msg.sender.send(msg.value - weiAmount)) 
        revert();
    }

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(getRate());

    // update totals
    totalSupply = totalSupply.add(tokens);
    weiRaised = weiRaised.add(weiAmount);

    balances[recipient] = balances[recipient].add(tokens);
    TokenCreated(recipient, tokens);

    // send ether to the vault
    if (!vault.send(weiAmount)) revert();
  }

  // return dynamic pricing
  function getRate() constant returns (uint256) {
    uint256 bonus = 0;
    if (now < (startTime + 1 weeks)) {
      bonus = 300;
    } else if (now < (startTime + 2 weeks)) {
      bonus = 200;
    } else if (now < (startTime + 3 weeks)) {
      bonus = 100;
    }
    return BASE_RATE.add(bonus);
  }

  function tokenAmount(uint256 share, uint256 finalSupply) constant returns (uint) {
    if (share > TOTAL_SHARE) revert();

    return share.mul(finalSupply).div(TOTAL_SHARE);
  }

  // grant regular tokens by share
  function grantTokensByShare(address to, uint256 share, uint256 finalSupply) internal {
    uint256 tokens = tokenAmount(share, finalSupply);
    balances[to] = balances[to].add(tokens);
    TokenCreated(to, tokens);
    totalSupply = totalSupply.add(tokens);
  }

  function getFinalSupply() constant returns (uint256) {
    return TOTAL_SHARE.mul(totalSupply).div(CROWDSALE_SHARE);
  }


  // do final token distribution
  function finalize() onlyOwner() {
    if (isFinalized) revert();

    //if we are under the cap and not hit the duration then throw
    if (weiRaised < WEI_RAISED_CAP && now <= startTime + DURATION) revert();

    uint256 finalSupply = getFinalSupply();
    
    //grantVestedTokensByShare(ANGELS_ADDRESS, ANGELS_SHARE, finalSupply);
    //grantVestedTokensByShare(CORE_1_ADDRESS, CORE_1_SHARE, finalSupply);
    //grantVestedTokensByShare(CORE_2_ADDRESS, CORE_2_SHARE, finalSupply);

    grantTokensByShare(ANGELS_ADDRESS, ANGELS_SHARE, finalSupply);
    grantTokensByShare(CORE_1_ADDRESS, CORE_1_SHARE, finalSupply);
    grantTokensByShare(CORE_2_ADDRESS, CORE_2_SHARE, finalSupply);

    grantTokensByShare(PARTNERSHIP_ADDRESS, PARTNERSHIP_SHARE, finalSupply);
    grantTokensByShare(REWARDS_ADDRESS, REWARDS_SHARE, finalSupply);
    grantTokensByShare(AFFILIATE_ADDRESS, AFFILIATE_SHARE, finalSupply);
    
    isFinalized = true;
  }

  bool public tokenSaleOnHold;

  function toggleTokenSaleOnHold() onlyOwner() {
    if (tokenSaleOnHold)
      tokenSaleOnHold = false;
    else
      tokenSaleOnHold = true;
  }

  /********************************************************************************
  **** MIGRATION CODE                                                           ***
  ********************************************************************************/
  bool public migrateDisabled;

  struct structMigrate {
    uint dateTimeCreated;
    uint amount;
  }

  mapping(address => structMigrate) pendingMigrations;

  function toggleMigrationStatus() onlyOwner() {
    if (migrateDisabled)
      migrateDisabled = false;
    else
      migrateDisabled = true;
  }

  function migrate(uint256 amount) {

    //dont allow migrations until crowdfund is done
    if (!isFinalized) 
      revert();

    //dont proceed if migrate is disabled
    if (migrateDisabled) 
      revert();

    //dont proceed if there is pending value
    if (pendingMigrations[msg.sender].amount > 0)
      revert();

    //amount parameter is in Wei
    //old rex token is only 4 decimal places
    //i.e. to migrate 8 old REX (80000) user inputs 8, ui converts to 8**18 (wei), then we divide by 14dp to get the original 80000.
    //uint256 amount_4dp = amount / (10**14);

    //this will throw if they dont have the balance/allowance
    StandardToken(previousToken).transferFrom(msg.sender, this, amount);

    //store time and amount in pending mapping
    pendingMigrations[msg.sender].dateTimeCreated = now;
    pendingMigrations[msg.sender].amount = amount;
  }

  function claimMigrate() {

    //dont allow if migrations are disabled
    if (migrateDisabled) 
      revert();

    //dont proceed if no value
    if (pendingMigrations[msg.sender].amount == 0)
      revert();

    //can only claim after a week has passed
    if (now < pendingMigrations[msg.sender].dateTimeCreated + 1 weeks)
      revert();

    //credit the balances
    balances[msg.sender] += pendingMigrations[msg.sender].amount;
    totalSupply += pendingMigrations[msg.sender].amount;

    //remove the pending migration from the mapping
    delete pendingMigrations[msg.sender];
  }

  /********************************************************************************
  **** Access Tokens                                                            ***
  ********************************************************************************/
  function transferOwnCoins(address _to, uint _value) onlyOwner() {
    if (!isFinalized) revert();

    balances[this] = balances[this].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(this, _to, _value);
  }

}
