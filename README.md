# ppjs-new
PixelPlace JS working

### Usage
```js
// Create the client
const pp = new PixelPlace(authKey, authToken, authId, boardId);

// Initiate the client
await pp.Init();

// returns the color of the pixel at X and Y
// this will give the pixel color prior to it being updated from the pixel event
pp.getPixelAt(x, y);

// returns the color id of the r, g, and b
// returns -1 if non-existent
pp.getColorId(r, g, b);

// places a pixel at x,y with id col
// if brush isn't set, it will default to 1
pp.placePixel(x, y, col, brush);

// will run the function with its value when 'key' is received from the socket
// you can also use 'Packets' from PixelPlace.js, e.g. Packets.PIXEL
// value won't be set for some packets, such as chat loaded
pp.on("key", (value) => {});

// emits 42["key", value] through the socket
// e.g. sends data+
pp.emit("key", value);
```

### Full Bot

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