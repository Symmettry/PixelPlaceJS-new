# ppjs-new
PixelPlace JS v2 basically

https://www.npmjs.com/package/pixelplacejs-new

Extremely versatile NodeJS library for pixelplace.

Easily capable of drawing 3000x3000 images (May have a delay on hefty sorting like FROM_CENTER or TO_CENTER)

Able to do many many things unlike most bots (Like chat bots -- Erebot is made in this)

[View Documentation](https://symmettry.github.io/PixelPlaceJS-new/)

### Useful Bot Stuff

```js
// Create PixelPlace instances
// autoRestart?: if the bots should automatically attempt to reconnect when the socket closes, defaults to true
// handleErrors?: if an error is received from pixelplace, should it be handled (recommended), defaults to true -- Note: throw.error of id 49 will always be processed; as it gets new auth data
const pp = new PixelPlace(auths, autoRestart?, handleErrors?);

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
// autoFix?: automatically update the rate to the rate_change value
// suppress?: suppress console warning for pixel speed under rate_change, defaults to false
// pp.bots[index].setPlacementSpeed(30);
// pp.bots[index].setPlacementSpeed(() => Math.floor(Math.random() * 10) + 20);
// pp.bots[index].setPlacementSpeed((previous) => previous > 30 ? previous / 2 : previous * 2);
pp.bots[index].setPlacementSpeed(number | (prevValue?: number) => number, autoFix?, suppress?);

// Also related to this, you can manually access the rate value if you want it.
pp.bots[index].rate

// places a pixel at x,y with color id col
// if brush isn't set, it will default to 1 (Brush used to place pixels)
// if protect isn't set, it will default to false (Should it be protected?)
// if force isn't set, it will default to false (Should it place over pixels of the same color?)
await pp.bots[index].placePixel(x, y, col, brush?, protect?, force?);

// draws the image at "path_to_image" at starting point x and y (This is not central, it is the top left of the final drawing)
// mode?: drawing mode, (See "Image Drawing Modes"), defaults to Modes.TOP_LEFT_TO_RIGHT. Can also be a DrawingFunction
// protect?: protect the image, defaults to false
// force?: places pixels over pixels of the same color, defaults to false
await pp.bots[index].drawImage(x, y, "path_to_image", mode? | DrawingFunction?, protect?, force?);

// Drawing function type -- directly taken from the code
type DrawingFunction = (pixels: NdArray<Uint8Array>, drawHook: (x: number, y: number, pixels: NdArray<Uint8Array>) => Promise<void>, getColorAtHook: (x: number, y: number, pixels: NdArray<Uint8Array>) => number) => Promise<void>;

// returns if chat is loaded or not
pp.bots[index].isChatLoaded();

// returns a list of IArea; which contains info on them
pp.bots[index].getAreas()

// gets an area by an id
pp.bots[index].getAreaById(id)

// gets an area by its name
pp.bots[index].getArea(name)

// returns if a war is currently occurring
pp.bots[index].isWarOccurring()

// gets the name of the current war
pp.bots[index].getCurrentWarZone()

// returns true if a pixel is in a war zone and false ifnot. This doesn't account for if a war is started or not.
pp.bots[index].isPixelInWarZone(area, x, y)

// will run the function with its value when 'key' is received from the socket
// you can also use a string for it, but it's recommended to use 'Packets' imported from the library
// value won't be set for some packets, such as chat loaded
// "Packet" refers to a string; use 'Packets' imported from the library
pp.bots[index].on(Packet, (value) => {});

// returns the color of the pixel at X and Y
// this will give the pixel color prior to it being updated from the pixel event
pp.bots[index].getPixelAt(x, y);

// returns the color id of the color closest to the r, g, and b values inputted via IRGB, aka {r, g, b}
pp.bots[index].getClosestColorId({r, g, b});

// returns 'IStatistics' interface. JSDocs describe what each value is
pp.bots[index].getStatistics();

// Returns the username of a UID; string | number (For premium accounts, if the account is not premium it will throw an error)
pp.bots[index].getUsername(uid);

// Text is made with a builder due to the many applicable options. All method calls are optional in the builder.
pp.bots[index].buildText("Text Here", x, y, protect?, wars?, force?)
    // The color of text can be changed with .textColor() -- otherwise it defaults to black.
    .textColor(Colors.ORANGE)
    // The background color of text can be changed with .backgroundColor() -- otherwise it defaults to transparent.
    .backgroundColor(Colors.BLUE)
    // The space length can be changed with .spaceLength() -- otherwise it defaults to 1 pixel.
    .spaceLength(15)
    // The length between each character can be changed with .separatorLength() -- otherwise it defaults to 1 pixel.
    .separatorLength(5)
    // The distance between each line can be changed with .lineGap() -- otherwise it defaults to 1 pixel.
    .lineGap(3)
    // The font can be changed with .font() -- otherwise it defaults to Font.SMALL_FONT; you can also input your own custom font using FontData.
    .font(Font.MEDIUM_FONT)
    // You can make the text fill in gaps between lines, characters, and spaces with .colorEmpty() -- defaults to false.
    .colorEmpty(true)
    // You can also modify the x, y, and text values later, which is useful for using the same builder.
    .x(15).y(15).text("changed")
    // when stringing text together, it will not fill the gaps between each text block. This will make it do that -- defaults to false.
    .fillBetween(true)
    // This makes it finally draw. If updatePos is true, it will set the X and Y position to the ending position of the text.
    .draw(updatePos?);

// Image drawing modes can be accessed like this
Modes.<MODE> // JSDocs will describe the mode information

// Packet categories. JSDocs describe the packets
// (replace <NAME> with the actual packet name of course!)
Packets.RECEIVED.<NAME> // Packets received by the server. Example: Packets.RECEIVED.PIXEL = all received pixel data within 300ms
Packets.SENT.<NAME> // Packets sent by the client. Example: Packets.SENT.PIXEL = sent pixel data
Packets.LIBRARY.<NAME> // Library packets, such as errors and socket closing. Example: Packets.LIBRARY.SOCKET_CLOSED = called when socket is clsosed
Packets.LIBRARY.ALL // All 42 id packets will be sent through this, the function has a key and a value; pp.bots[index].on(Packets.ALL, (key, value) => {});
Packets.LIBRARY.RAW // Raw received packet data is transferred through this. Only has (value) => {}
Packets.LIBRARY.SENT // Raw sent packet data. Only has (value) => {}

// Errors
PPError.<NAME> // Error packets; these are names mapped to the ids sent through Packets.RECEIVED.ERROR. Example PPError.INVALID_AUTH
ErrorMessages[ID] // The messages for these errors. This is not an enum. Example: ErrorMessages[PPError.INVALID_AUTH] = error message for invalid auth
```

### Full Bot

```js
import { PixelPlace, Auth, Modes, Packets, Colors, PPError } from "pixelplacejs-new";

(async () => {
    const boardId = 123456; // change this

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

    // 16 ms between each pixel (Default rate)
    // Commented since this is already done by default, this is just some sample code.
    //
    // pp.bots[0].setPlacementSpeed(pp.bots[0].getRate());

    // draws image at path "C:/my image.png" (will throw an error if it doesn't exist)
    await pp.bots[0].drawImage(x, y, "C:/my image.png", Modes.FROM_CENTER);

    // places a 10x10 area of white (You should probably remove this; it's just an example)
    for(var x=0;x<10;x++) {
        for(var y=0;y<10;y++) {
            await pp.bots[0].placePixel(1000 + x, 1000 + y, Colors.WHITE);
        }
    }

    // draws "Hello World!" at 100,100
    await pp.bots[0].buildText("Hello World!", 100, 100).draw();
})();

```
