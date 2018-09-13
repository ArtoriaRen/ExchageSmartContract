var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchange = artifacts.require("./Exchange.sol");

contract('Exchange Order Tests', function (accounts) {
    before(function () {
        var instanceExchange;
        var instanceToken;
        return exchange.deployed().then(function (instance) {
            instanceExchange = instance;
            return instanceExchange.depositEther({from:accounts[0], value: web3.toWei(4, "ether")});
        }).then(function (txResult) {
            return fixedSupplyToken.deployed();
        }).then(function (myTokenInstance) {
            instanceToken = myTokenInstance;
            return instanceExchange.addToken("FIXED", instanceToken.address);
        }).then(function (txResult) {
            return instanceToken.transfer(accounts[1], 2000);
        }).then(function (txResult) {
            return instanceToken.approve(instanceExchange.address, 2000, {from: accounts[1]});
        }).then(function (txResult) {
            return instanceExchange.depositToken("FIXED", 2000, {from: accounts[1]});
            // accounts[1] now hold 2000 tokens in the Exchange.
        });
    });

    it("should be possible to fulfill buy market orders", function () {
        var myExchangeInstance;
        return exchange.deployed().then(function (instance) {
            myExchangeInstance = instance;
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook) {
            // getSellOrderBook returns (uint[] arrPricesSell, uint[] arrVolumeSell)
            assert.equal(orderBook.length, 2, "SellOrderBook should have 2 fields");
            assert.equal(orderBook[0].length, 0, "SellOrderBook should have 0 buy offers");
            // accounts[1] wants to sell 5 tokens for 3 finney each. Note that accounts[1] is able to do so because she
            // has deposited tokens beforehand.
            return myExchangeInstance.sellToken("FIXED", web3.toWei(3, "finney"), 5, {from: accounts[1]});
        }).then(function (txResult) {
            /**
             * Assert the logs
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted.");
            assert.equal(txResult.logs[0].event, "LimitSellOrderCreated", "The Log-Event should be LimitSellOrderCreated");
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function(orderBook) {
            assert.equal(orderBook[0].length, 1, "OrderBook should have 1 sell offer");
            assert.equal(orderBook[1].length, 1, "OrderBook should have 1 sell volume");
            // test the first element of uint[] arrVolumeSell
            assert.equal(orderBook[1][0], 5, "OrderBook should have a volume of 5 coins someone wants to sell");
            // accounts[0] wants to buy 5 tokens at 4 finney each.
            return myExchangeInstance.buyToken("FIXED", web3.toWei(4, "finney"), 5, {from: accounts[0]});
        }).then(function(txResult){
            /**
             * Assert the logs
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted");
            assert.equal(txResult.logs[0].event, "BuyOrderFulfilled", "The Log-event should be SellOrderFulfilled");
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook) {
            assert.equal(orderBook[0].length, 0, "SellOrderBook should have 0 sell offers");
            assert.equal(orderBook[1].length, 0, "SellOrderBook should have 0 sell volume");
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook){
            assert.equal(orderBook[0].length, 0, "BuyOrderBook should have 0 sell offers");
            assert.equal(orderBook[1].length, 0, "BuyOrderBook should have 0 sell volume");
        });
    });
});





