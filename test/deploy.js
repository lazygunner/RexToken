'use strict';

var test = require('tape');
require('./stdlib');

require("../contracts/build/RexToken.js");
var rextoken = {};

test('mine a up to date block', function(t) {
    mine(function() {
        console.log('Block mined');
        t.end();
    });
})

test('deploy RexToken', function (t) {
    var contract = web3.eth.contract(global["RexToken" + "_abi"]);
    var bin = "0x" + global["RexToken" + "_bin"];
    var fromObj = {from: accounts[0], gas: maxGas, gasPrice: myGasPrice, data: bin}

    var txConfCallback = function(err, myContract) {
        if (err) {
            throw err;
            t.end();
        }
        else if (myContract.address != null ){
            //var txHash = myContract.transactionHash;
            //var receipt = web3.eth.getTransactionReceipt(txHash);
            t.equal(true, myContract.address.length == 42);
            rextoken.instance = myContract;
            rextoken.hasDeployed = true;
            t.end();
        }
    }

    //var dateTime = require('node-datetime');
    //var dt = Math.floor(new Date().getTime() / 1000);
    var dt = web3.eth.getBlock('latest').timestamp;
    //require('process').exit();

    var startTime = dt + 600;  // 10 minutes in the future
    var vault = accounts[9];

    contract.new(startTime, vault, null, fromObj, txConfCallback);
});

test('check default state', function (t) {
    t.equal(rextoken.instance.name(), "REX - Real Estate tokens");
    t.equal(rextoken.instance.decimals().eq(18), true);
    t.equal(rextoken.instance.WEI_RAISED_CAP().gt(0), true);
    t.equal(rextoken.instance.weiRaised().eq(0), true);
    t.equal(rextoken.instance.tokenSaleOnHold(), false);
    t.equal(rextoken.instance.migrateDisabled(), false);    
    
    t.end();
})

test('try contribute before it starts', function(t) {
    t.throws(function() {
        web3.eth.sendTransaction({from: accounts[0], to:rextoken.instance.address, value: web3.toWei(1,"ether"), gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})    

test('try finalize before it starts', function(t) {
    t.throws(function() {
        var txHash = rextoken.instance.finalize({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

test('try disable tokensale from unauthd', function(t) {
    t.throws(function() {
        rextoken.instance.toggleMigrationStatus({from: accounts[2], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

//fast forward the date by 11 minutes
test('increase time', function(t) {
    increaseTime(11 * 60, function() {
        console.log('Time increased');
        t.end();
    });
})

test('try contribute', function(t) {
    var vaultpre = web3.eth.getBalance(accounts[9]);
    var amountWei = web3.toWei(1,"ether");
    var txHash = web3.eth.sendTransaction({from: accounts[0], to:rextoken.instance.address, value: amountWei, gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        var vaultpost = web3.eth.getBalance(accounts[9]);
        t.equal(vaultpre.plus(amountWei).eq(vaultpost),true);
        t.end();
    })
})

test('check user balance of REX', function(t) {
    var balance = rextoken.instance.balanceOf(accounts[0]);
    t.equal(balance.eq(web3.toWei(1000,'ether')), true);
    t.end();
})

test('totalSupply should have increased', function(t) {
    var totalSupply = rextoken.instance.totalSupply();
    t.equal(totalSupply.eq(web3.toWei(1000,'ether')), true);
    t.end();
})

test('disable tokensale', function(t) {
    var txHash = rextoken.instance.toggleTokenSaleOnHold({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        t.end();
    })
})

test('try contribute while disabled', function(t) {
    t.throws(function() {
        web3.eth.sendTransaction({from: accounts[0], to:rextoken.instance.address, value: web3.toWei(1,"ether"), gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

test('reenable tokensale', function(t) {
    var txHash = rextoken.instance.toggleTokenSaleOnHold({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        t.end();
    })
})

test('try contribute after re-enabled, from another account', function(t) {
    var txHash = web3.eth.sendTransaction({from: accounts[1], to:rextoken.instance.address, value: web3.toWei(0.5,"ether"), gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        t.end();
    })
})

test('check user balance of REX', function(t) {
    var balance = rextoken.instance.balanceOf(accounts[1]);
    t.equal(balance.eq(web3.toWei(500,'ether')), true);
    t.end();
})

test('totalSupply should have increased', function(t) {
    var totalSupply = rextoken.instance.totalSupply();
    t.equal(totalSupply.eq(web3.toWei(1500,'ether')), true);
    t.end();
})

//fast forward the date by 7 days
test('increase time', function(t) {
    increaseTime(7 * 24 * 60 * 60, function() {
        console.log('Time increased');
        t.end();
    });
})

test('getRate should drop to 900', function(t) {
    var rate = rextoken.instance.getRate();
    t.equal(rate.toNumber(), 900);
    t.end();
})

test('try send REX to another account before finalized', function(t) {
    t.throws(function() {
        rextoken.instance.transfer(accounts[1], web3.toWei(1,'ether'), {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

//fast forward the date by 7 days
test('increase time', function(t) {
    increaseTime(21 * 24 * 60 * 60, function() {
        console.log('Time increased');
        t.end();
    });
})

test('try contribute after time is up', function(t) {
    t.throws(function() {
        web3.eth.sendTransaction({from: accounts[0], to:rextoken.instance.address, value: web3.toWei(1,"ether"), gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

test('finalize tokensale', function(t) {
    var pretotalSupply = rextoken.instance.totalSupply();
    var txHash = rextoken.instance.finalize({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        var posttotalSupply = rextoken.instance.totalSupply();
        t.equal(pretotalSupply.times(2).eq(posttotalSupply), true);
        t.end();
    })
})

test('send REX to another account', function(t) {
    var preBalance = rextoken.instance.balanceOf(accounts[1]);
    var weiAmount = web3.toWei(0.1, 'ether');
    var txHash = rextoken.instance.transfer(accounts[1], weiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function() {
        showGasConsumption(txHash);
        var postBalance = rextoken.instance.balanceOf(accounts[1]);
        t.equal(preBalance.add(weiAmount).eq(postBalance), true);
        t.end();
    })
})

test('send REX to rextoken contract', function(t) {
    var selfAddress = rextoken.instance.address;
    var preBalance = rextoken.instance.balanceOf(selfAddress);
    var weiAmount = web3.toWei(0.1, 'ether');
    var txHash = rextoken.instance.transfer(selfAddress, weiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function() {
        showGasConsumption(txHash);
        var postBalance = rextoken.instance.balanceOf(selfAddress);
        t.equal(preBalance.add(weiAmount).eq(postBalance), true);
        t.end();
    })
})

test('transfer REX out of rextoken contract', function(t) {
    var selfAddress = rextoken.instance.address;
    var preBalance = rextoken.instance.balanceOf(selfAddress);
    var preBalanceAcct2 = rextoken.instance.balanceOf(accounts[2]);
    var weiAmount = web3.toWei(0.1, 'ether');
    var txHash = rextoken.instance.transferOwnCoins(accounts[2], weiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function() {
        showGasConsumption(txHash);
        var postBalance = rextoken.instance.balanceOf(selfAddress);
        var postBalanceAcct2 = rextoken.instance.balanceOf(accounts[2]);
        t.equal(preBalance.minus(weiAmount).eq(postBalance), true);
        t.equal(preBalanceAcct2.plus(weiAmount).eq(postBalanceAcct2), true);
        t.end();
    })
})

test('try send more REX from contract than it has', function(t) {
    var weiAmount = web3.toWei(0.1, 'ether');
    t.throws(function() {
        //console.log(weiAmount);
        rextoken.instance.transferOwnCoins(accounts[2], weiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})


test('check balances', function (t) {
    console.log("accounts[0]: " + web3.fromWei(rextoken.instance.balanceOf(accounts[0]), 'ether').toNumber());
    console.log("accounts[1]: " + web3.fromWei(rextoken.instance.balanceOf(accounts[1]), 'ether').toNumber());
    console.log("accounts[2]: " + web3.fromWei(rextoken.instance.balanceOf(accounts[2]), 'ether').toNumber());
    t.end();
})

var rextoken2 = {};

// TODO: Test Migrations
test('deploy second RexToken', function (t) {
    var contract = web3.eth.contract(global["RexToken" + "_abi"]);
    var bin = "0x" + global["RexToken" + "_bin"];
    var fromObj = {from: accounts[0], gas: maxGas, gasPrice: myGasPrice, data: bin}

    var txConfCallback = function(err, myContract) {
        if (err) {
            throw err;
            t.end();
        }
        else if (myContract.address != null ){
            //var txHash = myContract.transactionHash;
            //var receipt = web3.eth.getTransactionReceipt(txHash);
            t.equal(true, myContract.address.length == 42);
            rextoken2.instance = myContract;
            rextoken2.hasDeployed = true;
            t.end();
        }
    }

    //var dateTime = require('node-datetime');
    //var dt = Math.floor(new Date().getTime() / 1000);
    var dt = web3.eth.getBlock('latest').timestamp;
    //require('process').exit();

    var startTime = dt + 600;  // 10 minutes in the future
    var vault = accounts[9];

    contract.new(startTime, vault, rextoken.instance.address, fromObj, txConfCallback);
});

//fast forward the date by 29 days (4 weeks + 1 day)
test('increase time', function(t) {
    increaseTime(29 * 24 * 60 * 60, function() {
        console.log('Time increased');
        t.end();
    });
})

test('finalize tokensale2', function(t) {
    var txHash = rextoken2.instance.finalize({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        var totalSupply = rextoken2.instance.totalSupply();
        t.equal(totalSupply.toNumber(), 0);
        t.end();
    })
})

test('set allowance to tokensale2', function(t) {
    var approvalWeiAmount = web3.toWei(1000, 'ether');
    var txHash = rextoken.instance.approve(rextoken2.instance.address, approvalWeiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        var allowance = rextoken.instance.allowance(accounts[0], rextoken2.instance.address);
        t.equal(allowance.eq(approvalWeiAmount), true);
        t.end();
    })
})

test('migrate rextokens to rextoken2', function(t) {
    var preBalance = rextoken.instance.balanceOf(accounts[0]);
    var approvalWeiAmount = web3.toBigNumber(web3.toWei(999.8, 'ether'));
    var txHash = rextoken2.instance.migrate(approvalWeiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);
        //check balance in rextoken 1
        var postBalance = rextoken.instance.balanceOf(accounts[0]);
        t.equal(preBalance.minus(approvalWeiAmount).eq(postBalance), true);
        //console.log(preBalance)
        //console.log(approvalWeiAmount_4dp)
        //console.log(postBalance)

        //check balance in rextoken 2
        var totalSupply = rextoken2.instance.totalSupply();
        t.equal(totalSupply.toNumber(), 0);
        t.end();
    })
})

test('claim migration before 1 week has passed', function(t) {
    t.throws(function() {
        rextoken2.instance.claimMigrate({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

//fast forward time
test('increase time', function(t) {
    increaseTime(8 * 24 * 60 * 60, function() {
        console.log('Time increased');
        t.end();
    });
})

test('claim migration', function(t) {
    var weiAmount = web3.toWei(999.8, 'ether');
    var txHash = rextoken2.instance.claimMigrate({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function()  {
        showGasConsumption(txHash);

        //check balance in rextoken 2
        var rextoken2Balance = rextoken2.instance.balanceOf(accounts[0]);
        t.equal(rextoken2Balance.eq(weiAmount), true);
        //console.log(rextoken2Balance)

        //check total supply
        var totalSupply = rextoken2.instance.totalSupply();
        t.equal(totalSupply.eq(weiAmount), true);
        //console.log(totalSupply)

        t.end();
    })
})

test('try claim migration a 2nd time', function(t) {
    var weiAmount = web3.toWei(999.8, 'ether');
    t.throws(function() {
        var txHash = rextoken2.instance.claimMigrate({from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    })
    t.end();
})

test('send REX to another account', function(t) {
    var preBalance = rextoken2.instance.balanceOf(accounts[1]);
    var weiAmount = web3.toWei(0.1, 'ether');
    var txHash = rextoken2.instance.transfer(accounts[1], weiAmount, {from: accounts[0], gas: maxGas, gasPrice: myGasPrice});
    waitForConf(t, txHash, function() {
        showGasConsumption(txHash);
        var postBalance = rextoken2.instance.balanceOf(accounts[1]);
        t.equal(preBalance.add(weiAmount).eq(postBalance), true);
        t.end();
    })
})