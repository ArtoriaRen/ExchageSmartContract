var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchange = artifacts.require("./Exchange.sol");

contract("Simple Order Test", function (accounts) {
    before(function () {
        var instanceExchange;
        var instanceFixedToken;
        return exchange.deployed().then(function (instance) {
            instanceExchange = instance;
            return instanceExchange.depositEther({from: accounts[0], value: web3.toWei(3, "ether")});
        }).then(function () {
            return fixedSupplyToken.deployed();
        }).then(function (instance) {
            instanceFixedToken = instance;
            return instanceFixedToken.approve(instanceExchange.address, 2000);
        }).then(function () {
            return instanceExchange.addToken("FIXED", instanceFixedToken.address);
        }).then(function () {
            instanceExchange.depositToken("FIXED", 2000);
        });
    });

    it("should be possible to add a limit buy order", function () {
        var instanceExchange;
        return exchange.deployed().then(function (instance) {
            instanceExchange = instance;
            return instanceExchange.getBuyOrderBook("FIXED");
        }).then(function (buyBook) {
            assert.equal(buyBook.length, 2, "BuyOrderBook should have 2 elements");
            assert.equal(buyBook[0].length, 0, "BuyOrderBook should have 0 buy offers");
            return instanceExchange.buyToken("FIXED", web3.toWei(1, "finney"), 5);
        }).then(function (txResult) {
            /*
            Assert the logs.
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted");
            assert.equal(txResult.logs[0].event, "LimitBuyOrderCreated", "Log-Event should be LimitBuyOrderCreated");
            return instanceExchange.getBuyOrderBook("FIXED");
        }).then(function (buyBook) {
            assert.equal(buyBook[0].length, 1, "The price array in BuyOrderBook should have 1 element");
            assert.equal(buyBook[1].length, 1, "The volumn array in BuyOrderBook should have 1 element");
        });

    });

    it("should be possible to add three buy orders", function () {
        var instanceExchange;
        var buyBookLengthBeforeAddMoreOrder;
        return exchange.deployed().then(function (instance) {
            instanceExchange = instance;
            return instanceExchange.getBuyOrderBook("FIXED");
        }).then(function (buyBook) {
            buyBookLengthBeforeAddMoreOrder = buyBook[0].length;
            return instanceExchange.buyToken("FIXED", web3.toWei(2, "finney"), 5);
        }).then(function (txResult) {
            assert.equal(txResult.logs[0].event, "LimitBuyOrderCreated", "Log-Event should be LimitBuyOrderCreated");
            return instanceExchange.buyToken("FIXED", web3.toWei(1.4, "finney"), 5);
        }).then(function (txResult) {
            assert.equal(txResult.logs[0].event, "LimitBuyOrderCreated", "Log-Event should be LimitBuyOrderCreated");
            return instanceExchange.getBuyOrderBook("FIXED");
        }).then(function (buyBook) {
            assert.equal(buyBook[0].length, buyBookLengthBeforeAddMoreOrder+2, "The price array in BuyOrderBook should have 2 more element");
            assert.equal(buyBook[1].length, buyBookLengthBeforeAddMoreOrder+2, "The volumn array in BuyOrderBook should have 2 more element");
        });
    });


    it("should be possible to add two limit sell orders", function () {
        var myExchangeInstance;
        return exchange.deployed().then(function (instance) {
            myExchangeInstance = instance;
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook) {
            return myExchangeInstance.sellToken("FIXED", web3.toWei(3, "finney"), 5);
        }).then(function(txResult) {
            /**
             * Assert the logs
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted.");
            assert.equal(txResult.logs[0].event, "LimitSellOrderCreated", "The Log-Event should be LimitSellOrderCreated");

            return myExchangeInstance.sellToken("FIXED", web3.toWei(6, "finney"), 5);
        }).then(function(txResult) {
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function(orderBook) {
            assert.equal(orderBook[0].length, 2, "OrderBook should have 2 sell offers");
            assert.equal(orderBook[1].length, 2, "OrderBook should have 2 sell volume elements");
        });
    });

    it("should be possible to create and cancel a buy order", function () {
        var myExchangeInstance;
        var orderBookLengthBeforeBuy, orderBookLengthAfterBuy, orderBookLengthAfterCancel, orderKey;
        return exchange.deployed().then(function (instance) {
            myExchangeInstance = instance;
            return myExchangeInstance.getBuyOrderBook.call("FIXED");
        }).then(function (orderBook) {
            orderBookLengthBeforeBuy = orderBook[0].length;
            return myExchangeInstance.buyToken("FIXED", web3.toWei(2.2, "finney"), 5);
        }).then(function(txResult) {
            /**
             * Assert the logs
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted.");
            assert.equal(txResult.logs[0].event, "LimitBuyOrderCreated", "The Log-Event should be LimitBuyOrderCreated");
            orderKey = txResult.logs[0].args._orderKey;
            return myExchangeInstance.getBuyOrderBook.call("FIXED");
        }).then(function (orderBook) {
            orderBookLengthAfterBuy = orderBook[0].length;
            assert.equal(orderBookLengthAfterBuy, orderBookLengthBeforeBuy + 1, "OrderBook should have 1 buy offers more than before");
            return myExchangeInstance.cancelOrder("FIXED", false, web3.toWei(2.2, "finney"), orderKey);
        }).then(function(txResult) {
            assert.equal(txResult.logs[0].event, "BuyOrderCanceled", "The Log-Event should be BuyOrderCanceled");
            return myExchangeInstance.getBuyOrderBook.call("FIXED");
        }).then(function(orderBook) {
            orderBookLengthAfterCancel = orderBook[0].length;
            assert.equal(orderBookLengthAfterCancel, orderBookLengthAfterBuy, "OrderBook should have 1 buy offers, its not cancelling it out completely, but setting the volume to zero");
            assert.equal(orderBook[1][orderBookLengthAfterCancel-1].toNumber(), 0, "The available Volume should be zero");
        });
    });


    it("should be possible to create and cancel a sell order", function () {
        var myExchangeInstance;
        var orderBookLengthBeforeSell, orderBookLengthAfterSell, orderBookLengthAfterCancel, orderKey;
        return exchange.deployed().then(function (instance) {
            myExchangeInstance = instance;
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook) {
            orderBookLengthBeforeSell = orderBook[0].length;
            /* sell price must be higher than the buy price in the last test case, so that the order can not be fulfilled.
             Also, the sell price shulde be different from those ones in test case "should be possible to add two limit sell orders",
             otherwise, no new entry will be created on the sellBook.
             */
            return myExchangeInstance.sellToken("FIXED", web3.toWei(3, "ether"), 5);
        }).then(function(txResult) {
            /**
             * Assert the logs
             */
            assert.equal(txResult.logs.length, 1, "There should have been one Log Message emitted.");
            assert.equal(txResult.logs[0].event, "LimitSellOrderCreated", "The Log-Event should be LimitSellOrderCreated");
            orderKey = txResult.logs[0].args._orderKey;
            return myExchangeInstance.getSellOrderBook.call("FIXED");
        }).then(function (orderBook) {
            orderBookLengthAfterSell = orderBook[0].length;
            assert.equal(orderBookLengthAfterSell, orderBookLengthBeforeSell + 1, "OrderBook should have 1 sell offers more than before");
            return myExchangeInstance.cancelOrder("FIXED", true, web3.toWei(3, "ether"), orderKey);
        // }).then(function(txResult) {
        //     assert.equal(txResult.logs[0].event, "SellOrderCanceled", "The Log-Event should be SellOrderCanceled");
        //     return myExchangeInstance.getSellOrderBook.call("FIXED");
        // }).then(function(orderBook) {
        //     orderBookLengthAfterCancel = orderBook[0].length;
        //     assert.equal(orderBookLengthAfterCancel, orderBookLengthAfterSell, "OrderBook should have 1 sell offers, its not cancelling it out completely, but setting the volume to zero");
        //     assert.equal(orderBook[1][orderBookLengthAfterCancel-1].toNumber(), 0, "The available Volume should be zero");
        });
    });
});