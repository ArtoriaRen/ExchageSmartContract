pragma solidity ^0.4.13;

import "./FixedSupplyToken.sol";

contract Exchange is Owned {
    //----------GENERAL STRUCTURE------------//

    // One personal offer of buying or selling tokens
    struct Offer{
        address who;
        uint amount;
    }

    /* OrderBook is just an entry in 'buyBook' or 'sellBook'. It stores all
    Offers of the same price.
    */
    struct OrderBook {
        uint higherPrice;
        uint lowerPrice;

        // offers_key => Offer, where offers_key works as an index. This mapping is just like an array.
        mapping (uint => Offer) offers;

        // The index of first unfulfilled offer of a certain price. The range of offers_key is [0, offers_length -1].
        uint offers_key;
        // 'offers_length' = # of nonFulfilledOffer
        uint offers_length;
    }

    struct Token {
        address tokenContract;
        string symbolName;

        // (price => OrderBook)
        mapping (uint => OrderBook) buyBook;
        mapping (uint => OrderBook) sellBook;

        /* 'buyBook' and 'sellBook' are linked lists, so we need store pointers.
        For 'buyBook', the highest price will be the current buy price;
        for 'sellBook', the lowest price will be the current sell price.
        */
        uint curBuyPrice;
        /* my own understanding: persons who want to buy at lower price than
        current buy price have to wait, so they are placed on the buyBook. */
        uint lowestBuyPrice;
        // the amount of buyPrice is the lengthOfLinkedList -1. ?
        uint amountBuyPrices;

        uint curSellPrice;
        uint highestSellPrice;
        uint amountSellPrices;

    }

    // we support a max of 255 tokens
    // 'tokens' maps index to Token
    mapping (uint8 => Token) tokens;
    // the index of latest added token. equals to #tokens
    uint8 symbolNameIndex;

    //--------------BALANCE-----------------//
    // 'tokenBalanceForAddress' is the mapping (address => (tokenIndex => balance))
    mapping (address => mapping (uint8 => uint)) tokenBalanceForAddress;
    // Ether balance
    mapping (address => uint) balanceEthForAddress;

    //--------------EVENTS-----------------//
    // EVENTS for deposit/withdrawl
    event DepositForTokenReceived(address indexed _from, uint indexed _symbolIndex, uint _amount, uint _timestamp);
    event WithdrawlToken(address indexed _to, uint indexed _symbolIndex, uint _amount, uint _timestamp);
    event DepositForEthReceived(address indexed _from, uint _amount, uint _timestamp);
    event WithdrawlEth(address indexed _to, uint _amount, uint _timestamp);

    //EVENTS for orders
    event LimitSellOrderCreated(uint indexed _symbolIndex, address indexed _who, uint _amountTokens, uint _priceInWei, uint _orderKey);
    event SellOrderFulfilled(uint indexed _symbolIndex, uint _amount, uint _priceInWei, uint _orderKey);
    event SellOrderCanceled(uint indexed _symbolIndex, uint _priceInWei, uint _orderKey);
    event LimitBuyOrderCreated(uint indexed _symbolIndex, address indexed _who, uint _amountTokens, uint _priceInWei, uint _orderKey);
    event BuyOrderFulfilled(uint indexed _symbolIndex, uint _amount, uint _priceInWei, uint _orderKey);
    event BuyOrderCanceled(uint indexed _symbolIndex, uint _priceInWei, uint _orderKey);

    //EVENTS for management
    event TokenAddedToSystem(uint _symbolIndex, string _token, uint _timestamp);

    //----------DEPOSIT AND WITHDRAWAL ETHER-----------//
    function depositEther() payable {
        // check if the amount overflows the range of uint256(uint)
        require(balanceEthForAddress[msg.sender] + msg.value >= balanceEthForAddress[msg.sender]);
        balanceEthForAddress[msg.sender] += msg.value;
        DepositForEthReceived(msg.sender, msg.value, now);
    }

    function withdrawEther (uint amountInWei) {
        // check underflow
        require(balanceEthForAddress[msg.sender] - amountInWei >=0);
        require(balanceEthForAddress[msg.sender] - amountInWei <= balanceEthForAddress[msg.sender]);
        balanceEthForAddress[msg.sender] -= amountInWei;
        WithdrawlEth(msg.sender, amountInWei, now);
    }

    function getEthBalanceInWei() constant returns (uint) {
        return balanceEthForAddress[msg.sender];
    }

    //------------TOKEN MANAGEMENT-----------//
    function addToken(string symbolName, address erc20TokenAddress) onlyOwner {
        require(!hasToken(symbolName));
        symbolNameIndex++;
        tokens[symbolNameIndex].symbolName = symbolName;
        tokens[symbolNameIndex].tokenContract = erc20TokenAddress;
        TokenAddedToSystem(symbolNameIndex, symbolName, now);
    }

    function hasToken(string symbolName) constant returns (bool) {
        uint8 index = getSymbolIndex(symbolName);
        if (index==0) return false;
        return true;
    }

    function getSymbolIndex (string symbolName) internal returns (uint8) {
        for (uint8 i=1; i<= symbolNameIndex; i++) {
            if (stringsEqual(tokens[i].symbolName, symbolName)){
                return i;
            }
        }
        return 0;
    }

    function getSymbolIndexOrThrow(string symbolName) returns (uint8) {
        uint8 index = getSymbolIndex(symbolName);
        require(index > 0);
        return index;
    }

    // helper function---compare two strings
    function stringsEqual (string storage _a, string memory _b) internal returns (bool) {
        bytes storage a = bytes(_a);
        bytes memory b = bytes(_b);
        if (a.length != b.length) {
            return false;
        }
        for (uint i=0; i<a.length; i++){
            if(a[i] != b[i]) return false;
        }
        return true;
    }

    //-------------DEPOSIT AND WITHDRAWAL TOKEN------------//
    function depositToken(string symbolName, uint amount) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        require(tokens[symbolIndex].tokenContract != address(0));

        ERC20Interface token = ERC20Interface(tokens[symbolIndex].tokenContract);

        require(token.transferFrom(msg.sender, address(this), amount) == true);
        require(tokenBalanceForAddress[msg.sender][symbolIndex] + amount >=
        tokenBalanceForAddress[msg.sender][symbolIndex]);

        tokenBalanceForAddress[msg.sender][symbolIndex] += amount;

        DepositForTokenReceived(msg.sender, symbolIndex, amount, now);
    }

    function withdrawToken (string symbolName, uint amount) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        require(tokens[symbolIndex].tokenContract != address(0));

        ERC20Interface token = ERC20Interface(tokens[symbolIndex].tokenContract);

        require(tokenBalanceForAddress[msg.sender][symbolIndex] - amount >= 0);
        require(tokenBalanceForAddress[msg.sender][symbolIndex] - amount <=
        tokenBalanceForAddress[msg.sender][symbolIndex]);

        tokenBalanceForAddress[msg.sender][symbolIndex] -= amount;
        require(token.transfer(msg.sender, amount) == true);
        WithdrawlToken(msg.sender, symbolIndex, amount, now);
    }

    function getBalance(string symbolName) constant returns (uint) {
        return tokenBalanceForAddress[msg.sender][getSymbolIndexOrThrow(symbolName)];
    }

    //-----------ORDERED BOOK - BID ORDERS---------//
    // 'BuyOrderBook' consists of (price[], volumn[])
    function getBuyOrderBook (string symbolName) constant returns (uint[], uint[]) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        uint[] memory arrPricesBuy = new uint[](tokens[symbolIndex].amountBuyPrices);
        uint[] memory arrVolumnBuy = new uint[](tokens[symbolIndex].amountBuyPrices);

        // No offers at all, so we return directly.
        if (tokens[symbolIndex].amountBuyPrices <= 0) return (arrPricesBuy, arrVolumnBuy);

        uint counter = 0; // the index of the two arrays to be returned
        uint iteratePrice = tokens[symbolIndex].lowestBuyPrice;
        while (iteratePrice <= tokens[symbolIndex].curBuyPrice && iteratePrice != 0){
            arrPricesBuy[counter] = iteratePrice;
            uint unfulfilledOrderIndex = tokens[symbolIndex].buyBook[iteratePrice].offers_key;
            uint volumn = 0;
            while (unfulfilledOrderIndex < tokens[symbolIndex].buyBook[iteratePrice].offers_length){
                volumn += tokens[symbolIndex].buyBook[iteratePrice].offers[unfulfilledOrderIndex].amount;
                unfulfilledOrderIndex++;
            }
            arrVolumnBuy[counter] = volumn;
            counter++;
            iteratePrice = tokens[symbolIndex].buyBook[iteratePrice].higherPrice;
        }

        return (arrPricesBuy, arrVolumnBuy);

    }


    //-----------OREDERED BOOK - ASK ORDER----------//
    function getSellOrderBook (string symbolName) constant returns (uint[], uint[]) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        uint[] memory arrPricesSell = new uint[](tokens[symbolIndex].amountSellPrices);
        uint[] memory arrVolumnSell = new uint[](tokens[symbolIndex].amountSellPrices);

        // No offers at all, so we return directly.
        if (tokens[symbolIndex].amountSellPrices <= 0) return (arrPricesSell, arrVolumnSell);

        uint counter = 0; // the index of the two arrays to be returned
        uint iteratePrice = tokens[symbolIndex].curSellPrice;
        while (iteratePrice <= tokens[symbolIndex].highestSellPrice && iteratePrice != 0){
            arrPricesSell[counter] = iteratePrice;
            uint unfulfilledOrderIndex = tokens[symbolIndex].sellBook[iteratePrice].offers_key;
            uint volumn = 0;
            while (unfulfilledOrderIndex < tokens[symbolIndex].sellBook[iteratePrice].offers_length){
                volumn += tokens[symbolIndex].sellBook[iteratePrice].offers[unfulfilledOrderIndex].amount;
                unfulfilledOrderIndex++;
            }
            arrVolumnSell[counter] = volumn;
            counter++;
            iteratePrice = tokens[symbolIndex].sellBook[iteratePrice].higherPrice;
        }

        return (arrPricesSell, arrVolumnSell);

    }

    //----------NEW ORDER - BID ORDER--------------//
    function buyToken (string symbolName, uint priceInWei, uint amount) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        // the amount of Ether we will spend to buy the token
        uint totalAmountEthNecessary = priceInWei * amount;
        // make sure we have enough Ether to buy the token
        require(balanceEthForAddress[msg.sender] >= totalAmountEthNecessary);

        // overflow check
        require(totalAmountEthNecessary >= priceInWei);
        require(totalAmountEthNecessary >= amount);
        require(balanceEthForAddress[msg.sender] - totalAmountEthNecessary >= 0);

        // first deduct the amount of Ether from user's balanceEthForAddress
        balanceEthForAddress[msg.sender] -= totalAmountEthNecessary;

        if (tokens[symbolIndex].amountSellPrices == 0 || tokens[symbolIndex].curSellPrice > priceInWei){
            // Limit order: We don't have sell orders to filfull this buy order, so we need to create a limit order.
            addBuyOffer(symbolIndex, priceInWei, amount, msg.sender);
            // The last element of this Event is the offer_key.
            LimitBuyOrderCreated(symbolIndex, msg.sender, amount, priceInWei,
                tokens[symbolIndex].buyBook[priceInWei].offers_length -1);
        } else {
            /*Market order: current sell price is smaller or equal to
            priceInWei (the buy price of this order),
            so we ca fulfill the order immediately. */

            revert(); //just a placeholder for now.
        }
    }

    //add limited buy order logic
    function addBuyOffer(uint8 symbolIndex, uint priceInWei, uint amount, address who){
        // assgin the current numOfCurrentBuyOffersAtSamePrice to offers_key.
        tokens[symbolIndex].buyBook[priceInWei].offers_key = tokens[symbolIndex].buyBook[priceInWei].offers_length;
        tokens[symbolIndex].buyBook[priceInWei]
        .offers[tokens[symbolIndex].buyBook[priceInWei].offers_key] = Offer(who, amount);
        tokens[symbolIndex].buyBook[priceInWei].offers_length++;

        /* If this price exists before, we are done; otherwise we have to insert it to the
        right place in the linked list of buy prices. */
        if (tokens[symbolIndex].buyBook[priceInWei].offers_length == 1){
            // There is no offers at this price before, so we need to increase the number of price.
            tokens[symbolIndex].amountBuyPrices++;

            //-----Find the right place ( set lowerPrice and higherPrice) for this price in Linked list--------
            if (tokens[symbolIndex].lowestBuyPrice == 0 && tokens[symbolIndex].curBuyPrice == 0){
                // there is no buy order yet, we insert the first one.
                tokens[symbolIndex].buyBook[priceInWei].higherPrice = 0;
                tokens[symbolIndex].buyBook[priceInWei].lowerPrice = 0;
                tokens[symbolIndex].curBuyPrice = priceInWei;
                tokens[symbolIndex].lowestBuyPrice = priceInWei;
            } else if (priceInWei < tokens[symbolIndex].lowestBuyPrice) {
                // priceInWei is the new lowest buy price.
                tokens[symbolIndex].buyBook[priceInWei].higherPrice = tokens[symbolIndex].lowestBuyPrice;
                tokens[symbolIndex].buyBook[priceInWei].lowerPrice = 0;
                tokens[symbolIndex].buyBook[tokens[symbolIndex].lowestBuyPrice].lowerPrice = priceInWei;
                tokens[symbolIndex].lowestBuyPrice = priceInWei;
            } else if (priceInWei > tokens[symbolIndex].curBuyPrice){
                //priceInWei is the new highest buy price.
                tokens[symbolIndex].buyBook[priceInWei].lowerPrice = tokens[symbolIndex].curBuyPrice;
                tokens[symbolIndex].buyBook[priceInWei].higherPrice = 0;
                tokens[symbolIndex].buyBook[tokens[symbolIndex].curBuyPrice].higherPrice = priceInWei;
                tokens[symbolIndex].curBuyPrice = priceInWei;
            } else {
                // priceInWei is somewhere in the middle, we need to find the right spot to insert.
                uint iteratePrice = tokens[symbolIndex].curBuyPrice;
                bool found = false;
                while (iteratePrice > 0 && !found) {
                    if (iteratePrice < priceInWei && tokens[symbolIndex].buyBook[iteratePrice].higherPrice > priceInWei){
                        // we found the right place
                        tokens[symbolIndex].buyBook[priceInWei].higherPrice =
                        tokens[symbolIndex].buyBook[iteratePrice].higherPrice;
                        tokens[symbolIndex].buyBook[priceInWei].lowerPrice = iteratePrice;

                        tokens[symbolIndex].buyBook[tokens[symbolIndex].buyBook[iteratePrice].higherPrice].lowerPrice =
                        priceInWei;
                        tokens[symbolIndex].buyBook[iteratePrice].higherPrice = priceInWei;

                        found = true;
                    }
                    iteratePrice = tokens[symbolIndex].buyBook[iteratePrice].lowerPrice;
                }
            }
        }
    }

    //------------NEW ORDER - ASK ORDER------------//
    function sellToken (string symbolName, uint priceInWei, uint amount){
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        uint totalAmountEthWillReceived = priceInWei * amount;


        // make sure we have enough tokes to sell
        require(tokenBalanceForAddress[msg.sender][symbolIndex] >= amount);

        // overflow check
        require(tokenBalanceForAddress[msg.sender][symbolIndex] - amount >= 0);
        // overflow check
        require(totalAmountEthWillReceived >= priceInWei);
        require(totalAmountEthWillReceived >= amount);
        require(balanceEthForAddress[msg.sender] + totalAmountEthWillReceived >= balanceEthForAddress[msg.sender]);

        // first deduct the amount of Token from user's tokenBalanceForAddress
        tokenBalanceForAddress[msg.sender][symbolIndex] -= amount;

        if (tokens[symbolIndex].amountBuyPrices == 0 || tokens[symbolIndex].curBuyPrice < priceInWei){
            // Limit order: We don't have buy orders to filfull this sell order, so we need to create a limit order.
            addSellOffer(symbolIndex, priceInWei, amount, msg.sender);
            LimitSellOrderCreated(symbolIndex, msg.sender, amount, priceInWei,
                tokens[symbolIndex].buyBook[priceInWei].offers_length);
        } else {
            /*Market order: current buy price is greater than or equal to
            priceInWei (sell price of this order),
            so we ca fulfill the order immediately. */

            revert(); //just a placeholder for now.
        }
    }

    //add limited buy order logic
    function addSellOffer(uint8 symbolIndex, uint priceInWei, uint amount, address who){
        // assgin the current numOfCurrentSellOffersAtSamePrice to offers_key.
        tokens[symbolIndex].sellBook[priceInWei].offers_key = tokens[symbolIndex].sellBook[priceInWei].offers_length;
        tokens[symbolIndex].sellBook[priceInWei]
        .offers[tokens[symbolIndex].sellBook[priceInWei].offers_key] = Offer(who, amount);
        tokens[symbolIndex].sellBook[priceInWei].offers_length++;

        /* If this price exists before, we are done; otherwise we have to insert it to the
        right place in the linked list of sell prices. */
        if (tokens[symbolIndex].sellBook[priceInWei].offers_length == 1){
            // There is no offers at this price before, so we need to increase the number of price.
            tokens[symbolIndex].amountSellPrices++;

            //-----Find the right place ( set lowerPrice and higherPrice) for this price in Linked list--------
            if (tokens[symbolIndex].highestSellPrice == 0 && tokens[symbolIndex].curSellPrice == 0){
                // there is no sell order yet, we insert the first one.
                tokens[symbolIndex].sellBook[priceInWei].higherPrice = 0;
                tokens[symbolIndex].sellBook[priceInWei].lowerPrice = 0;
                tokens[symbolIndex].curSellPrice = priceInWei;
                tokens[symbolIndex].highestSellPrice = priceInWei;
            } else if (priceInWei > tokens[symbolIndex].highestSellPrice) {
                // priceInWei is the new highest sell price.
                tokens[symbolIndex].sellBook[priceInWei].higherPrice = 0;
                tokens[symbolIndex].sellBook[priceInWei].lowerPrice = tokens[symbolIndex].highestSellPrice;
                tokens[symbolIndex].sellBook[tokens[symbolIndex].highestSellPrice].higherPrice = priceInWei;
                tokens[symbolIndex].highestSellPrice = priceInWei;
            } else if (priceInWei > tokens[symbolIndex].curSellPrice){
                //priceInWei is the new lowest sell price.
                tokens[symbolIndex].sellBook[priceInWei].lowerPrice = 0;
                tokens[symbolIndex].sellBook[priceInWei].higherPrice = tokens[symbolIndex].curSellPrice;
                tokens[symbolIndex].sellBook[tokens[symbolIndex].curSellPrice].lowerPrice = priceInWei;
                tokens[symbolIndex].curSellPrice = priceInWei;
            } else {
                // priceInWei is somewhere in the middle, we need to find the right spot to insert.
                uint iteratePrice = tokens[symbolIndex].curSellPrice;
                bool found = false;
                while (iteratePrice > 0 && !found) {
                    if (iteratePrice < priceInWei && tokens[symbolIndex].sellBook[iteratePrice].higherPrice > priceInWei){
                        // we found the right place
                        tokens[symbolIndex].sellBook[priceInWei].higherPrice =
                        tokens[symbolIndex].sellBook[iteratePrice].higherPrice;
                        tokens[symbolIndex].sellBook[priceInWei].lowerPrice = iteratePrice;

                        tokens[symbolIndex].sellBook[tokens[symbolIndex].sellBook[iteratePrice].higherPrice].lowerPrice =
                        priceInWei;
                        tokens[symbolIndex].sellBook[iteratePrice].higherPrice = priceInWei;

                        found = true;
                    }
                    iteratePrice = tokens[symbolIndex].sellBook[iteratePrice].higherPrice;
                }
            }
        }
    }

    //-----------CANCEL LIMIT ORDER----------------//
    function cancelOrder(string symbolName, bool isSellOrder, uint priceInWei, uint offerKey) {
        uint8 symbolIndex = getSymbolIndexOrThrow(symbolName);
        if (isSellOrder){
            require(tokens[symbolIndex].sellBook[priceInWei].offers[offerKey].who == msg.sender);
            uint tokenAmountToRefund = tokens[symbolIndex].sellBook[priceInWei].offers[offerKey].amount;
            // overflow check
            require(tokenBalanceForAddress[msg.sender][symbolIndex] +  tokenAmountToRefund >= tokenBalanceForAddress[msg.sender][symbolIndex]);

            tokenBalanceForAddress[msg.sender][symbolIndex] += tokenAmountToRefund;
            tokens[symbolIndex].sellBook[priceInWei].offers[offerKey].amount = 0;
            SellOrderCanceled(symbolIndex, priceInWei, offerKey);
        } else {
            require(tokens[symbolIndex].buyBook[priceInWei].offers[offerKey].who == msg.sender);
            uint ethAmountToRefund = tokens[symbolIndex].buyBook[priceInWei].offers[offerKey].amount * priceInWei;
            // overflow check
            require(balanceEthForAddress[msg.sender] + ethAmountToRefund >= balanceEthForAddress[msg.sender]);

            balanceEthForAddress[msg.sender] += ethAmountToRefund;
            tokens[symbolIndex].buyBook[priceInWei].offers[offerKey].amount = 0;
            BuyOrderCanceled(symbolIndex, priceInWei, offerKey);
        }

    }
}
