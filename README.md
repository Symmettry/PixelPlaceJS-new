# ppjs-new
PixelPlace JS v2 basically

### Usage
```js
// Create auths
var auths = [
    new Auth({
        authKey: "", // Fill this
        authToken: "", // Fill this
        authId: "", // Fill this
    }, boardId), // Assign board id
]

// Create PixelPlace instances
// autoRestart?: if the bots should automatically attempt to reconnect when the socket closes, defaults to true
const pp = new PixelPlace(auths, autoRestart?);

// Initiate all bots
await pp.Init();

// index is the bot, e.g. bots[0] is similar to auths[0]

// returns the color of the pixel at X and Y
// this will give the pixel color prior to it being updated from the pixel event
pp.bots[index].getPixelAt(x, y);

// returns the color id of the r, g, and b
// returns -1 if non-existent
pp.bots[index].getColorId(r, g, b);

// assigns pixel placement speed to a function or a number
// supress?: suppress console warning for pixel speed under 20, defaults to false
// pp.bots[index].setPlacementSpeed(30);
// pp.bots[index].setPlacementSpeed(() => Math.floor(Math.random() * 10) + 20);
pp.bots[index].setPlacementSpeed(number | Function, supress?);

// places a pixel at x,y with id col
// if brush isn't set, it will default to 1
// if protect isn't set, it will default to false
// if force isn't set, it will default to false
pp.bots[index].placePixel(x, y, col, brush?, protect?, force?);

// will run the function with its value when 'key' is received from the socket
// you can also use 'Packets' from PixelPlace.js, e.g. Packets.PIXEL
// value won't be set for some packets, such as chat loaded
pp.bots[index].on("key", (value) => {});

// emits 42["key", value] through the socket
// e.g. sends data+
pp.bots[index].emit("key", value);

// draws the image at "path_to_image" at x and y (left->right)
// mode?: drawing mode, (Modes.LEFT_TO_RIGHT, etc.), defaults to Modes.LEFT_TO_RIGHT
// protect?: protect the image, defaults to false
// force?: places pixels over pixels of the same color, defaults to false
pp.bots[index].drawImage(x, y, "path_to_image", mode?, protect?, force?);

// returns 'Statistics' interface, including pixels placed, pixels protected, and images drawn
pp.bots[index].getStatistics();
```

### Full Bot

```js
import { PixelPlace, Packets, Auth } from "pixelplacejs-new";

(async () => {

    var boardId = 7;

    var auths = [
        new Auth({
            authKey: "", // Fill this
            authToken: "", // Fill this
            authid: "" // Fill this
        }, boardId),
    ]

    var pp = new PixelPlace(auths);
    await pp.Init();
    console.log("PP is ready!");

    pp.bots[0].on(Packets.RECEIVED.CHAT_MESSAGE, (message) => {
        if(message.channel != "global")return;
        console.log(message.username + ": " + message.message);
    });

})();
```