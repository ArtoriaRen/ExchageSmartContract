var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchange = artifacts.require("./Exchange.sol");

contract('MyExchage', function (accounts) {
    it("deposit and withdraw Ether", function () {
        var exchangeInstance;
        var balanceBeforeDeposit = web3.eth.getBalance(accounts[0]);
        var balanceAfterDeposit;
        var balanceAfterWithdrawl;
        var gasUsed = 0;
        return exchange.deployed().then(function (instance) {
            exchangeInstance = instance;
            return exchangeInstance.depositEther({from: accounts[0], value: web3.toWei(1, "ether")});
        }).then(function (txResult) {
            // Gas is rounded so we cannot use assert.equal later.
            gasUsed += txResult.receipt.cumulativeGasUsed *
                web3.eth.getTransaction(txResult.receipt.transactionHash).gasPrice.toNumber();
            balanceAfterDeposit = web3.eth.getBalance(accounts[0]);
            return exchangeInstance.getEthBalanceInWei();
        }).then(function (ethBalanceInExchange) {
            assert.equal(ethBalanceInExchange.toNumber(), web3.toWei(1, "ether"),
                "Exchange doesn't credit user's deposit.");
            assert.isAtLeast(balanceBeforeDeposit - balanceAfterDeposit, web3.toWei(1, "ether"),
                "User balance is not correct");
            return exchangeInstance.withdrawEther(web3.toWei(1, "ether"));
        }).then(function () {
            balanceAfterWithdrawl = web3.eth.getBalance(accounts[0]);
            return exchangeInstance.getEthBalanceInWei();
        }).then(function (ethBalanceInExchange) {
            assert.equal(ethBalanceInExchange.toNumber(), 0,
                "Ether balance in Exchange after withdrawl is not correct.");
            // console.log(typeof gasUsed);
            // console.log(typeof web3.toWei(10, "ether") );
            // console.log(web3.toWei(10, "ether") );
            assert.isAtLeast(balanceBeforeDeposit - balanceAfterWithdrawl, 2*gasUsed,
                "Ether reduction of the whole deposit and withdrawl process should be greater than 2*gasUsed");
        });
    });

    it("deposit and withdraw token", function () {
        var tokenSypplyInstance;
        var exchangeInstance;
        var _totalSupply;
        return fixedSupplyToken.deployed().then(function (instance) {
            tokenSypplyInstance = instance;
            return exchange.deployed();
        }).then(function (instance) {
            exchangeInstance = instance;
            return tokenSypplyInstance.approve(exchangeInstance.address, 1000);
        }).then(function () {
            return exchangeInstance.addToken("FIXED", tokenSypplyInstance.address);
        }).then(function (txResult) {
            // console.log(txResult);
            assert.equal(txResult.logs[0].event, "TokenAddedToSystem", "TokenAddedToSystem Event should be emitted.");
            return exchangeInstance.hasToken("FIXED");
        }).then(function (boolHasToken) {
            assert.ok(boolHasToken, "addToken fails.");
            return exchangeInstance.depositToken("FIXED", 500);
        }).then(function () {
            return exchangeInstance.getBalance("FIXED");
        }).then(function (balance) {
            assert.equal(balance, 500, "Wrong token balance in Exchange after deposit.");
            // use call() method to read the value of state variable.
            return tokenSypplyInstance._totalSupply.call();
        }).then(function (totalSupply) {
            _totalSupply = totalSupply.toNumber();
            return exchangeInstance.withdrawToken("FIXED", 500);
        }).then(function () {
            return exchangeInstance.getBalance("FIXED");
        }).then(function (balance) {
            assert.equal(balance, 0 , "Wrong token balance in Exchange after withdrawl.");
            // The two contracts are deployed by accouts[0], so accouts[0] is the owner of all "FIXED" tokens.
            return tokenSypplyInstance.balanceOf(accounts[0]);
        }).then(function (balanceInERC) {
            assert.equal(balanceInERC, _totalSupply, "Token owner didn't receive withdraw money back.");
        });

    });
});