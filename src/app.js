const { Logger } = require("hns-logger-plugin");
const { Http } = require("hns-http-plugin");
const { Application } = require("hns-app");

exports.app = new Application();
var app = exports.app;
(async () => {
  try {
    app.loadConfig("loggerConfig", require("./config/logger.json"));
    app.logger = new Logger(app, app.get("loggerConfig"));
    app.logger.replaceConsole();

    app.loadConfig("httpConfig", require("./config/http.json"));
    app.http = new Http(app, app.get("httpConfig"));
    app.http.setExceptionHandler((req, res, e) => {
      let errString;
      if (typeof e == "string") {
        errString = e;
        console.error(e);
      } else {
        errString = e.message;
        console.setStack(e.stack).error(e.message);
      }

      res.json({
        code: 500,
        message: errString,
      });
    });

    app.http.start();

    //todo
    app.loadConfig("signerConfig", require("./config/signer.json"));
    const signers = app.get("signerConfig");

    const { ScriptHelper } = require("./lib/sensible_ft/ScriptHelper");
    const { SatotxSigner } = require("./lib/sensible_ft/SatotxSigner");
    ScriptHelper.prepare([
      new SatotxSigner(signers[0].satotxApiPrefix),
      new SatotxSigner(signers[1].satotxApiPrefix),
      new SatotxSigner(signers[2].satotxApiPrefix),
    ]);

    console.log("start completed");
  } catch (e) {
    console.error("start failed", e);
  }
})();
