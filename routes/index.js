var express = require("express");
var router = express.Router();
var fs = require("fs");
const request = require("request");
var axios = require("axios");

var crypto = require("crypto");

var Cart = require("../models/cart");
var products = JSON.parse(fs.readFileSync("./data/products.json", "utf8"));

//MARK: onepay payment gateway values

//MARK: payment base url
var paymentUrl =
  "https://merchant-api-live-v2.onepay.lk/api/ipg/gateway/request-transaction/?hash=";

//MARK: Please access onepay merchant admin panel to get this values
var appId = "";
var appToken = "";
var salt = "";
var transactionRedirectUrl = "http://localhost:3000/response/";

//MARK: Index Route
router.get("/", function (req, res, next) {
  res.render("index", {
    title: "onepay shopping cart",
    products: products,
  });
});

//MARK: Add New Item Route
router.get("/add/:id", function (req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  var product = products.filter(function (item) {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect("/");
});

//MARK: Add Cart Route
router.get("/cart", function (req, res, next) {
  if (!req.session.cart) {
    return res.render("cart", {
      products: null,
    });
  }
  var cart = new Cart(req.session.cart);
  res.render("cart", {
    title: "onepay shopping cart",
    products: cart.getItems(),
    totalPrice: cart.totalPrice,
  });
});

//MARK: Remove Item Form Cart Route
router.get("/remove/:id", function (req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.remove(productId);
  req.session.cart = cart;
  res.redirect("/cart");
});

//MARK: Payment Route
router.post("/pay", function (req, res, next) {
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  //MARK: Remove all empty space when make json
  var data = JSON.stringify({
    amount: cart.totalPrice, //only alow LKR amouts
    app_id: appId,
    reference: "5888995555546656925", //enter uniq number
    customer_first_name: req.body.fname,
    customer_last_name: req.body.lname,
    customer_phone_number: req.body.phonenumber, //please enter number with +94
    customer_email: req.body.email,
    transaction_redirect_url: transactionRedirectUrl,
  });

  var hash = crypto.createHash("sha256");
  hash_obj = data + salt; //MARK: append slat to the json when make hash obj
  hash_obj = hash.update(hash_obj, "utf-8");
  gen_hash = hash_obj.digest("hex");

  //MARK: Make trasaction Request
  var config = {
    method: "get",
    url: paymentUrl + gen_hash,
    headers: {
      Authorization: appToken,
      "Content-Type": "application/json",
    },
    data,
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
      const json_data = JSON.parse(JSON.stringify(response.data));
      res.redirect(json_data.data.gateway.redirect_url);
      res.end();
    })
    .catch(function (error) {
      console.log(error);
    });
});

router.get("/response", function (req, res, next) {
  if (res.body) {
    //Failed transaction
    console.log(res.body);
    res.sendStatus(400);
  } else {
    //Success transaction
    console.log();
    res.sendStatus(200);
  }
});

module.exports = router;
