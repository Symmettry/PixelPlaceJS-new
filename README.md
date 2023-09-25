# ppjs-new
PixelPlace JS working

## Example Usage
```js
const { PixelPlace, Packets } = require("./PixelPlace.js");

(async () => {
          
    var authKey = ""; // Fill this
    var authToken = ""; // Fill this
    var authId = ""; // Fill this

    var boardId = 7;

    const pp = new PixelPlace(authKey, authToken, authId, boardId);
    await pp.Init();
    console.log("Pixel Place initiated!");

    pp.on(Packets.NEW_CHAT_MESSAGE, (message) => {
        console.log(message);
    });

})();
```