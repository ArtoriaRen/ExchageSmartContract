**This project implements an Exchage for trading different cryptocurrencies.**

# How to Run Test
1. In one terminal, run the following command:
    ```$bash
    testrpc
    ```
2. Change directory to `Truffle`.
In another terminal, run the following command:
    ```bash
    truffle test
    ```
    This command runs all test files under the `/test` folder.

3. To run a particular test file, e.g. `03_trading_simple.js` , use the following command:
    ```bash
    truffle test ./test/03_trading_simple.js
    ```

# How to Run Web Application
1. In one terminal, run the following command:
    ```$bash
    testrpc
    ```
    This project use web3 in Metamask. Please enable Metamask extension and
    import accounts returned by the above command. Alternatively, you can run testrpc with
    mnemonics so that you do not have to import new accounts every time.
    ```bash
    testrpc -m '<mnemonics>'
    ```

2. Change directory to `Truffle`.
In a second terminal, run the following command:
    ```bash
    npm run dev
    ```
    This command start the web server.
3. To deploy all smart contracts under the `/contracts` folder,
 open a third terminal and run the following commmand:
    ```bash
    truffle migrate
    ```
4. Open a web browser and connect to `localhost:8080`. 
You will see the webpage displayed.

## Test via Browser
1. Import the first and second accounts to Metamask. Since the first account 
has been used to deploy smart contracts, its Ether balance will be less than 100. 
All "FIXED" tokens, 1M, belong to the first accounts. And She is also 
the owner of the two smart contracts---FixedSupplyToken and Exchange.

### Manage Token Tab
1. Send Token
    
    Fill in "Amount in Token" with `50`, "To (Address)" with the second account 
    address. Then click on "Send Token" button. Metamask will pop up a page
    asking for confirmation. Click on "Confirm".
    
    You should see an "New Event: Transfer" under the "Events from the 
    Token Contract" label and the "Status from Javascript" displays
    "Transaction Complete!" on the log panel.

2. Add Token to Exchange
    
    In the terminal window where you execute `truffle migrate` previously, copy 
    the address following "FixedSupplyToken:" and paste it to "Address of Token".
    "Name of the Token" must be given, otherwise it will be an empty string. 
    Then click on "Add Token to Exchange" button.
     Metamask will pop up a page asking for confirmation. Click on "Confirm".

    You should see an "New Event: TokenAddedToSystem" under the  "Events from the 
    Exchange Contract" label on the log panel.
    
### Exchange Overview Tab
1. Display Token and Ether balance
    Token is hard coded to "FIXED", so its balance can only be displayed after
    you add "FIXED" token to the Exchange on the "Manage Token Tab".
    
## Note
1. Whenever you restart `testrpc`, run `truffle migrate` again.
1. Refresh the webpage each time you switch account in Metamask, restart `testrpc`, 
 or re-run `truffle migtrate`.
2. The first account created by `testrpc` is the account used for deploying contracts.
3. Token with the same name cannot be added to our Exchange twice. When testing
    the `addTokenToExchange` function, you may need to use `truffle migrate
    --reset` to re-deploy the two contracts so that the Exchange has a fresh
    state.


