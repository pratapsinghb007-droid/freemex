var axios = require('axios');
require('dotenv').config();
var index = require('../index');
var stock_prices = [];

const symbols = "GOOG,AAPL,META,ORCL,BIDU,QCOM,ADBE,INFY,CTSH,MSFT,AMZN,INTC,CSCO,EBAY,TXN,TSLA,NFLX,NVDA,JPM";

const get_stock_prices = async (Stocks) => {
    try {
        const stocks = await Stocks.find({});
        const tickers = symbols.toLowerCase();
        console.log('API Token : ', process.env.APIToken);
        console.log('API URI : ', process.env.API_URI);
        const res = await axios.get(`${process.env.API_URI}?tickers=${tickers}&token=${process.env.APIToken}`);
        console.log(res.data);
        stock_prices = res.data;
    } catch (err) {
        console.log(err.response ? err.response.data : err);
    }
};

const update_stock_prices = async (Stocks) => {
    await get_stock_prices(Stocks);

    if (stock_prices.length !== 0) {
        try {
            const updatedStocks = await Promise.all(
                stock_prices.map(async (stock) => {
                    var code = stock.ticker;
                    var latestPrice = stock.tngoLast * 100;
                    var change = (stock.tngoLast - stock.prevClose) * 100;
                    var changePerc = (
                        stock.prevClose === 0
                            ? 0
                            : ((stock.tngoLast - stock.prevClose) / stock.prevClose).toFixed(4)
                    );

                    // Time when Freemex updates the stock
                    var latestUpdate = new Date();

                    var updatedStock = {
                        price: latestPrice,
                        diff: change,
                        diffPerc: changePerc,
                        latestUpdate: latestUpdate
                    };

                    console.log("updating", code);
                    console.log(updatedStock);

                    try {
                        await Stocks.findOneAndUpdate(
                            { code: code },
                            updatedStock
                        );

                        return true;
                    } catch (err) {
                        console.log(err);
                        return false;
                    }
                })
            );

            console.log("Stock update completed:", updatedStocks.length);

            // Get the latest stock data from MongoDB
            const stocks = await Stocks.find({});

            // Send updated stocks to connected browsers
            index.sendEventsToAll(stocks);

            console.log("SSE update sent to clients");

        } catch (err) {
            console.log(err);
        }
    }
};

const update_player_assets = (Player, PlayerStock) => {
    Player.find({})
        .then((all_players) => {
            all_players.map((playerObj) => {
                playerObj.value_in_stocks = 0;
                PlayerStock.find({ player: playerObj._id })
                    .populate('player')
                    .populate('stock')
                    .then((playerstocks) => {
                        playerstocks.forEach((playerstock) => {
                            playerObj.value_in_stocks += playerstock.stock.price * playerstock.quantity;
                        });
                        Player.findByIdAndUpdate(playerObj._id, playerObj)
                            .then((updatedPlayer) => {
                                console.log("updated", updatedPlayer.name);
                            });
                    })
                    .catch(err => console.log(err));
            });
        })
        .catch(err => console.log(err));
};

module.exports = { update_stock_prices, update_player_assets };