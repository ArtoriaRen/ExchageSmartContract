//import jquery and bootstrap
import 'jquery';
import 'bootstrap-loader';
// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import exchange_artifacts from '../../build/contracts/Exchange.json'
import token_artifacts from '../../build/contracts/FixedSupplyToken.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var ExchangeContract = contract(exchange_artifacts);
var TokenContract = contract(token_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function() {

    var self = this;
   //Bootstrap the MetaCoin abstraction for Use.
      ExchangeContract.setProvider(web3.currentProvider);
      TokenContract.setProvider(web3.currentProvider);

      //get the initial account balance so it can be displayed.
      // call back function has two arguments---error and actual result.
      web3.eth.getAccounts(function (err, accs) {
        if(err != null){
          alert("There was an error fetching your accounts.");
          return;
        }

        if (accs.length == 0) {
          alert("Couldn't getany accounts! Make sure your Ethereum client is configured correctly");
          return;
        }

        accounts = accs;
        account = accounts[0];
      });

  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },
  printImportantInformation: function() {
    //print out some important information
      ExchangeContract.deployed().then(function(instance) {
          var divAddress = document.createElement("div");
          divAddress.appendChild(document.createTextNode("Address Exchange: " + instance.address));
          divAddress.setAttribute("class", "alert alert-info");
          document.getElementById("importantInformation").appendChild(divAddress);
      });
      TokenContract.deployed().then(function(instance) {
          var divAddress = document.createElement("div");
          divAddress.appendChild(document.createTextNode("Address Token: " + instance.address));
          divAddress.setAttribute("class", "alert alert-info");
          document.getElementById("importantInformation").appendChild(divAddress);
      });

      web3.eth.getAccounts(function(err, accs) {
          web3.eth.getBalance(accs[0], function(err1, balance) {
              var divAddress = document.createElement("div");
              var div = document.createElement("div");
              div.appendChild(document.createTextNode("Active Account: " + accs[0]));
              var div2 = document.createElement("div");
              div2.appendChild(document.createTextNode("Balance in Ether: " + web3.fromWei(balance, "ether")));
              divAddress.appendChild(div);
              divAddress.appendChild(div2);
              divAddress.setAttribute("class", "alert alert-info");
              document.getElementById("importantInformation").appendChild(divAddress);
          });

      });
  },
  /**
   * Exchange specific functions here
   */
  initExchange: function() {
    //init Exchange
      App.refreshBalanceExchange();
      App.printImportantInformation();
      App.watchExchangeEvents();
  },
  watchExchangeEvents: function() {
    //watch for Exchange Events
      var exchangeInstance;
      ExchangeContract.deployed().then(function (instance) {
          exchangeInstance = instance;
          exchangeInstance.allEvents({},{fromBlock: 0, toBlock: 'latest'}).watch(function (error,result) {
              var alertbox = document.createElement("div");
              alertbox.setAttribute("class", "alert alert-info alert-dismissible");
              var closeBtn = document.createElement("button");
              closeBtn.setAttribute("type", "button");
              closeBtn.setAttribute("class", "close");
              closeBtn.setAttribute("data-dismiss", "alert");
              closeBtn.innerHTML = "<span>&times;</span>"
              alertbox.appendChild(closeBtn);
              var eventTitle = document.createElement("div");
              eventTitle.innerHTML = '<strong>New Event: '+result.event+'</strong>';
              alertbox.appendChild(eventTitle);

              var argsBox = document.createElement("textarea");
              argsBox.setAttribute("class", "form-control");
              argsBox.innerText= JSON.stringify(result.args);
              alertbox.appendChild(argsBox);
              document.getElementById("exchangeEvents").appendChild(alertbox);
          });
      }).catch(function (e) {
          console.log(e);
          App.setStatus("Error watching events; see log.");
      })
  },
  addTokenToExchange: function() {
	  //function to add tokens to the exchange
      var nameOfToken = document.getElementById("inputNameTokenAddExchange").value;
      var addressOfToken = document.getElementById("inputAddressTokenAddExchange").value;
      ExchangeContract.deployed().then(function(instance) {
          return instance.addToken(nameOfToken, addressOfToken, {from: account});
      }).then(function(txResult) {
          console.log(txResult);
          App.setStatus("Token added");
      }).catch(function(e) {
          console.log(e);
          App.setStatus("Error getting balance; see log.");
      });
  },
  refreshBalanceExchange: function() {
	//refresh your balance
      var self = this;

      var exchangeInstance;
      ExchangeContract.deployed().then(function(instance) {
          exchangeInstance = instance;
          return exchangeInstance.getEthBalanceInWei();
      }).then(function(value) {
          var balance_element = document.getElementById("balanceEtherInExchange");
          balance_element.innerHTML = web3.fromWei(value, "ether");
          return exchangeInstance.getBalance("FIXED");
      }).then(function(value) {
          var balance_element = document.getElementById("balanceTokenInExchange");
          balance_element.innerHTML = value.toNumber();
      }).catch(function(e) {
          console.log(e);
          self.setStatus("Error getting balance; see log.");
      });
  },
  depositEther: function() {
  	  //deposit ether function
      var amountToken = document.getElementById("inputAmountDepositToken").value;
      var nameToken = document.getElementById("inputNameDepositToken").value;
      var exchangeInstance;
      ExchangeContract.deployed().then(function(instance) {
          exchangeInstance = instance;
          return exchangeInstance.depositToken(nameToken, amountToken, {from: account, gas: 4500000});
      }).then(function(txResult) {
          console.log(txResult);
          App.refreshBalanceExchange();
      }).catch(function(e) {
          console.log(e);
          self.setStatus("Error getting balance; see log.");
      });
  },
  withdrawEther: function() {
	//withdraw ether function
  },
  depositToken: function() {
	//deposit token function
      var amountToken = document.getElementById("inputAmountDepositToken").value;
      var nameToken = document.getElementById("inputNameDepositToken").value;
      var exchangeInstance;
      ExchangeContract.deployed().then(function(instance) {
          exchangeInstance = instance;
          return exchangeInstance.depositToken(nameToken, amountToken, {from: account, gas: 4500000});
      }).then(function(txResult) {
          console.log(txResult);
          App.refreshBalanceExchange();
      }).catch(function(e) {
          console.log(e);
          App.setStatus("Error getting balance; see log.");
      });
  },
  /**
   * TRADING FUNCTIONS FROM HERE ON
   */
  initTrading: function() {
    App.refreshBalanceExchange();
    App.printImportantInformation();
    App.updateOrderBooks();
    App.listenToTradingEvents();
  },
  updateOrderBooks: function() {
    //update the order books function
  },
  listenToTradingEvents: function() {
//listen to trading events
  },
  sellToken: function() {
 //sell token
  },
  buyToken: function() {
//buy token
  },

  /**
   * TOKEN FUNCTIONS FROM HERE ON
   */
  initManageToken: function() {
    App.updateTokenBalance();
    App.watchTokenEvents();
    App.printImportantInformation();
  },
  updateTokenBalance: function() {
    //update the token balance
      var tokenInstance;
      TokenContract.deployed().then(function (instance) {
          tokenInstance = instance;
          return tokenInstance.balanceOf.call(account);
      }).then(function (value) {
          var balance_element = document.getElementById("balanceTokenInToken");
          balance_element.innerHTML = value.valueOf();
      }).catch(function (e) {
          console.log(e);
          App.setStatus("Error getting balance; see log.");
      });
  },
  watchTokenEvents: function() {
      var tokenInstance;
      TokenContract.deployed().then(function (instance) {
          tokenInstance = instance;
          tokenInstance.allEvents({},{fromBlock: 0, toBlock: 'latest'}).watch(function (error,result) {
              var alertbox = document.createElement("div");
              alertbox.setAttribute("class", "alert alert-info alert-dismissible");
              var closeBtn = document.createElement("button");
              closeBtn.setAttribute("type", "button");
              closeBtn.setAttribute("class", "close");
              closeBtn.setAttribute("data-dismiss", "alert");
              closeBtn.innerHTML = "<span>&times;</span>"
              alertbox.appendChild(closeBtn);
              var eventTitle = document.createElement("div");
              eventTitle.innerHTML = '<strong>New Event: '+result.event+'</strong>';
              alertbox.appendChild(eventTitle);

              var argsBox = document.createElement("textarea");
              argsBox.setAttribute("class", "form-control");
              argsBox.innerText= JSON.stringify(result.args);
              alertbox.appendChild(argsBox);
              document.getElementById("tokenEvents").appendChild(alertbox);
          });
      }).catch(function (e) {
          console.log(e);
          App.setStatus("Error watching events; see log.");
      })
  },

  sendToken: function() {
      var amount = parseInt(document.getElementById("inputAmountSendToken").value);
      var receiver = document.getElementById("inputBeneficiarySendToken").value;
      
      App.setStatus("Initiating transaction.. (please wait)");
      
      var tokenInstance;
      return TokenContract.deployed().then(function (instance) {
          tokenInstance = instance;
          return tokenInstance.transfer(receiver, amount, {from: account});
      }).then(function () {
        App.setStatus("Transaction complete!");
        App.updateTokenBalance();
      }).catch(function (e) {
          console.log(e);
          App.setStatus("Error sending coin; see log.");
      })
  },

  // approve some amount of tokens to be used by Exchange---give Exchange the allowance to spend the tokens.
  allowanceToken: function() {
      var amount = parseInt(document.getElementById("inputAmountAllowanceToken").value);
      var receiver = document.getElementById("inputBeneficiaryAllowanceToken").value;

      App.setStatus("Initiating transaction.. (please wait)");

      var tokenInstance;
      return TokenContract.deployed().then(function (instance) {
          tokenInstance = instance;
          return tokenInstance.approve(receiver, amount, {from: account});
      }).then(function () {
          App.setStatus("Transaction complete!");
          App.updateTokenBalance();
      }).catch(function (e) {
          console.log(e);
          App.setStatus("Error approving coin; see log.");
      })
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  App.start();
});
