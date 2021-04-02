const { app } = require("../app");
const { NetMgr } = require("../domain/NetMgr");
const { TokenTxHelper } = require("../lib/sensible_ft/TokenTxHelper");
exports.default = function () {
  NetMgr.listen("POST", "/genesis", async function (req, res, params, body) {
    const oracles = app.get("oracleConfig");
    const {
      issuerPk,
      tokenName,
      tokenSymbol,
      decimalNum,

      utxos,
      utxoAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.genesis({
      satotxPubKeys: oracles.map((v) => v.satotxPubKey),

      issuerPk,
      tokenName,
      tokenSymbol,
      decimalNum,

      utxos,
      utxoAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/issue", async function (req, res, params, body) {
    const oracles = app.get("oracleConfig");
    const {
      genesisTxId,
      genesisOutputIndex,
      preUtxoTxId,
      preUtxoOutputIndex,
      preUtxoTxHex,
      spendByTxId,
      spendByOutputIndex,
      spendByTxHex,

      issuerPk,
      receiverAddress,
      tokenAmount,
      allowIncreaseIssues,
      oracleSelecteds,

      utxos,
      utxoAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.issue({
      satotxPubKeys: oracles.map((v) => v.satotxPubKey),

      genesisTxId,
      genesisOutputIndex,
      preUtxoTxId,
      preUtxoOutputIndex,
      preUtxoTxHex,
      spendByTxId,
      spendByOutputIndex,
      spendByTxHex,

      issuerPk,
      receiverAddress,
      tokenAmount,
      allowIncreaseIssues,
      oracleSelecteds,

      utxos,
      utxoAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/routeCheck", async function (req, res, params, body) {
    const oracles = app.get("oracleConfig");
    const {
      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,

      utxos,
      utxoAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.routeCheck({
      satotxPubKeys: oracles.map((v) => v.satotxPubKey),

      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,

      utxos,
      utxoAddress,
      feeb,
      network,
    });
  });

  NetMgr.listen("POST", "/transfer", async function (req, res, params, body) {
    const oracles = app.get("oracleConfig");
    const {
      senderPk,
      receivers,
      ftUtxos,
      routeCheckType,
      routeCheckHex,
      oracleSelecteds,

      utxos,
      utxoAddress,
      feeb,
      network,
    } = body;
    return await TokenTxHelper.transfer({
      satotxPubKeys: oracles.map((v) => v.satotxPubKey),

      senderPk,
      ftUtxos,
      receivers,
      routeCheckHex,
      routeCheckType,
      oracleSelecteds,

      utxos,
      utxoAddress,
      feeb,
      network,
    });
  });
};
