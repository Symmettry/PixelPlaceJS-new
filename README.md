# ppjs-new
PixelPlace JS v2 basically
https://www.npmjs.com/package/pixelplacejs-new

Extremely versatile NodeJS library for pixelplace.
Easily capable of drawing 3000x3000 images (May have a delay on hefty sorting like FROM_CENTER or TO_CENTER)
Able to do many many things unlike most bots (Like chat bots -- Erebot is made in this)

### Usage
```js
// example import
import { PixelPlace, Packets, Auth, Modes } from "pixelplacejs-new";

// Auth data
// Fill values, IAuthData = { authKey: "", authToken: "", authId: "" }
const auths = [
    new Auth(IAuthData, boardId), // Assign board id
]

// Create PixelPlace instances
// autoRestart?: if the bots should automatically attempt to reconnect when the socket closes, defaults to true
const pp = new PixelPlace(auths, autoRestart?);

// Initiate all bots
await pp.Init();

// Alternatively, you can do this
await pp.bots[0].Connect();
await pp.bots[0].Load();
// Why? If you wait for Connect(), you can then add a RAW or ALL packet listener before Load() and then see every single packet through the socket
// the Load() waits until it receives "canvas" which is also not sent through Packets.ALL here. So if you want all that data including old chat messages, you do this.

// index is the bot, e.g. bots[0] is auths[0]

// assigns pixel placement speed to a function or a number
// For function, it will include the previous placement value.
// supress?: suppress console warning for pixel speed under 20, defaults to false
// pp.bots[index].setPlacementSpeed(30);
// pp.bots[index].setPlacementSpeed(() => Math.floor(Math.random() * 10) + 20);
// pp.bots[index].setPlacementSpeed((previous) => previous > 30 ? previous / 2 : previous * 2);
pp.bots[index].setPlacementSpeed(number | Function, supress?);

// places a pixel at x,y with color id col
// if brush isn't set, it will default to 1 (Brush used to place pixels)
// if protect isn't set, it will default to false (Should it be protected?)
// if force isn't set, it will default to false (Should it place over pixels of the same color?)
await pp.bots[index].placePixel((x, y, col, brush?, protect?, force?) | IPixel);

// draws the image at "path_to_image" at starting point x and y (This is not central, it is the top left of the final drawing)
// mode?: drawing mode, (See "Image Drawing Modes"), defaults to Modes.TOP_LEFT_TO_RIGHT
// protect?: protect the image, defaults to false
// force?: places pixels over pixels of the same color, defaults to false
await pp.bots[index].drawImage((x, y, "path_to_image", mode?, protect?, force?) | IImage);

// will run the function with its value when 'key' is received from the socket
// you can also use a string for it, but it's recommended to use 'Packets' imported from the library
// value won't be set for some packets, such as chat loaded
// "Packet" refers to a string; use 'Packets' imported from the library
pp.bots[index].on(Packet, (value) => {});

// returns the color of the pixel at X and Y
// this will give the pixel color prior to it being updated from the pixel event
pp.bots[index].getPixelAt(x, y);

// returns the color id of the color closest to the r, g, and b values inputted via IRGB, aka {r, g, b}
pp.bots[index].getClosestColorId(IRGBColor);

// emits 42["packet", value] through the socket
// "Packet" refers to a string; use 'Packets' imported from the library
pp.bots[index].emit(Packet, value);

// returns 'IStatistics' interface
pp.bots[index].getStatistics();

// Returns the username of a UID; string | number (For premium accounts, if the account is not premium it will throw an error)
pp.bots[index].getUsername(uid);

// Image Drawing Modes
Modes.TOP_LEFT_TO_RIGHT // Draws from the top left to the top right
Modes.TOP_RIGHT_TO_LEFT // Draws from the top right to the top left

Modes.BOTTOM_LEFT_TO_RIGHT // Draws from the bottom left to the bottom right
Modes.BOTTOM_RIGHT_TO_LEFT // Draws from the bottom right to the bottom left

Modes.LEFT_TOP_TO_BOTTOM // Draws from the top left to the bottom left
Modes.LEFT_BOTTOM_TO_TOP // Draws from the bottom left to the top left

Modes.RIGHT_TOP_TO_BOTTOM // Draws from the top right to the bottom right
Modes.RIGHT_BOTTOM_TO_TOP // Draws from the bottom right to the top right

Modes.FROM_CENTER // Draws from the center outward
Modes.TO_CENTER // Draws outward to the center

Modes.RAND // Draws randomly

// Custom mode
// pixels is a 2d array with shape of the image. pixels.shape[0] = x, pixels.shape[1] = y
// x and y are offset by the images initial x and y assigned in drawImage()
// await draw(x, y, pixels) - will draw at x,y with the colored pixel at that location in pixels
// getColorAt(x, y, pixels) - will return the color at x,y in the image, this is the color that draw() places
await pp.bots[index].drawImage((x, y, "path_to_image", async (pixels: NdArray<Uint8Array>, draw: Function, getColorAt: Function) => { }, protect?, force?) | IImage);


// Packet categories
// (replace <NAME> with the actual packet name of course!)
Packets.RECEIVED.<NAME> // Packets received by the server
Packets.SENT.<NAME> // Packets sent by the client
Packets.LIBRARY.<NAME> // Library packets, such as errors and socket closing
Packets.ALL // All 42 id packets will be sent through this, the function has a key and a value; pp.bots[index].on(Packets.ALL, (key, value) => {});
Packets.RAW // Raw packet data is transferred through this. Only has (value) => {}

// Interfaces (Objects, e.g. IRGB is {red, green, blue})
IPixel = {
    x: number; // pixel placement x
    y: number; // pixel placement y
    col: number; // color of placement
    brush: number; // brush used (Default is 1)
    protect: boolean; // protect the pixel
    force: boolean; // force place over pixels of the same color
}

IImage = {
    x: number; // initial X (Top left)
    y: number; // initial Y (Top left)
    path: string; // path to image file
    mode: Modes | Function, // the mode (see MODES), or a function for custom modes
    protect: boolean; // if the image should be protected
    force: boolean; // force place over pixels of the same color
}

IAuthData = {
    authKey: string; // auth key for pxp
    authToken: string; // auth token for pxp
    authId: string; // auth id for pxp
}

IRGBColor = {
    r: number; // red value of color
    b: number; // blue value of color
    g: number; // green value of color
}

IStatistics = {
    pixels: {
        placing: {
            placed: number, // amount of pixels succesfully placed by the client
            attempted: number, // amount of pixels attempted to be placed by the client
            failed: number, // amount of pixels attempted to be place by the client that weren't registered by pxp
            first_time: number, // first pixel placed (Used for per_second calculation)
            per_second: number, // placed / (first_time * 0.001)
        },
        protection: {
            protected: number, // pixels protected
            repaired: number, // pixels repaired
            last_repair: number, // last repair time
        }
        colors: {
            [color: number]: number, // array of all colors and the amount placed, placing 10 white (0) would be { '0': 10 }; colors[0] = 10
        }
    },
    images: {
        drawing: number, // amount of images currently being drawn
        finished: number, // amount of images finished drawing
    },
    session: {
        time: number, // time the bot has been online
        errors: number, // errors encountered
        beginTime: number, // as soon as await Init() is resolved
    },
    socket: {
        sent: number, // packets sent through the client
        received: number, // packets received from the server
    }
}
```

### Full Bot

```js
import { PixelPlace, Auth, Modes, Packets, Colors } from "pixelplacejs-new";

(async () => {
    const boardId = 7;

    const auths = [
        new Auth({
            authKey: "", // fill
            authToken: "", // fill
            authId: "", // fill
        }, boardId),
    ];

    const pp = new PixelPlace(auths);
    await pp.Init();
    
    console.log("Pixel Place initiated!");

    // 48 ms between each pixel
    pp.bots[0].setPlacementSpeed(48);

    // draws image at path "C:/my image.png"
    await pp.bots[0].drawImage(x, y, "C:/my image.png", Modes.FROM_CENTER);

    // places a 10x10 area of white
    for(var x=0;x<10;x++) {
        for(var y=0;y<10;y++) {
            await pp.bots[0].placePixel(1000 + x, 1000 + y, Colors.WHITE);
        }
    }
})();

```
