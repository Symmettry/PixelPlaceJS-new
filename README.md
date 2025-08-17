# ppjs-new
PixelPlace JS v2 basically

https://www.npmjs.com/package/pixelplacejs-new

Extremely versatile NodeJS library for pixelplace. Alongside PPScript language for running the best bot without coding knowledge!

Easily capable of drawing 3000x3000 images (May have a delay on hefty sorting like FROM_CENTER or TO_CENTER)

Able to do many many things unlike most bots (Like chat bots -- Erebot is made in this)

Also supports a closely-english custom scripting language!!!

[View Documentation](https://symmettry.github.io/PixelPlaceJS-new/)

## Table of Contents
- [Installation](#installation)
- [Coded Bot Instructions](#useful-bot-stuff)
- [Coded Full Bot](#full-bot)
- [PPScript](#ppscript)
- [PPScript Example](#ppscript-example)

## Installation

### PPScript Installation
Go to [releases](https://github.com/Symmettry/PixelPlaceJS-new/releases) and download the zip of your OS type<br>
Extract the zip and find where the ppscript .sh or .bat file is.<br>
Create a file called "bot.ppscript" and inside of it, write the data for your bot<br>
Then drag this file onto the ppscript file and the bot will run!

### PPJS Installation
`npm i pixelplacejs-new`
yeah that's it lol

## Useful Bot Stuff

```js
// this readme is really bad and im way too lazy to fix everything with my new changes sob, just use the example

// Create PixelPlace instances
// autoRestart?: if the bots should automatically attempt to reconnect when the socket closes, defaults to true
// handleErrors?: if an error is received from pixelplace, should it be handled (recommended), defaults to true -- Note: throw.error of id 49 will always be processed; as it gets new auth data
const pp = new PixelPlace(params, autoRestart?, handleErrors?);

// Initiate all bots
await pp.Init();

// Alternatively, you can do this
await pp.Connect();
await pp.Load();
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
await pp.bots[index].placePixel({x, y, col, brush?, protect?, force?});

// draws the image at "path_to_image" at starting point x and y (This is not central, it is the top left of the final drawing)
// mode?: drawing mode, (See "Image Drawing Modes"), defaults to Modes.TOP_LEFT_TO_RIGHT. Can also be a DrawingFunction
// protect?: protect the image, defaults to false
// force?: places pixels over pixels of the same color, defaults to false
await pp.bots[index].drawImage({x, y, "path_to_image", mode? | DrawingFunction?, protect?, force?});

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
import { PixelPlace, Modes, Packets, Colors, PPError } from "pixelplacejs-new";

(async () => {
    const params = [
        {
            authData: {
                authKey: "key",
                authId: "id",
                authToken: "token",
            },
            boardID: 7,
        }
    ];

    const pp = new PixelPlace(params);
    await pp.Init();

    const bot = pp.bots[0];
    
    console.log("Pixel Place initiated!");

    // draws image at path "C:/my image.png" (will throw an error if it doesn't exist)
    await bot.drawImage({
        x: 100, y: 100,
        path:"C:/my image.png",
        mode: Modes.FROM_CENTER,
    });

    // places a 10x10 area of white (You should remove this; it's just an example)
    for(var x=0;x<10;x++) {
        for(var y=0;y<10;y++) {
            bot.placePixel(1000 + x, 1000 + y, Colors.WHITE);
        }
    }

    // draws "Hello World!" at 100,100 (also remove this)
    bot.buildText("Hello World!", 100, 100).draw();
})();

```

## PPScript

This language is simple and can sound like english.

### Comments
Comments are done with # and don't have to be only the line

### Printing
Printing can be done like this.
```
print "text"
```
Options for it are<br>
`newLine` if there should be a new line after it prints<br>
`lineClear` if it should wipe the line before printing
```
print "text" newLine=yes lineClear=yes
```

### Adding a bot
Can be done by supplying the auth data
```
bot authKey="" authId="" authToken=""
```
There's also other things you can add to help with multi-botting etc.
```
bot name="mybot" boardID=123 uidManager=true auth...
```
The bot's default name is "bot"

### Login
This is optional, any drawing will automatically login. However, this will pause until the login, and you can add a print after.
```
login

# example
print "hello world!"
```
You can also create the bots and the instance before completing the login
```
create
```

### Drawing

For all of these, you can do bot="name" to set what bot does which. It will default to the first bot if not specified.<br>
The bot can draw with the `draw` command

#### Images
```
draw image at x=123 y=123 path="/path/to/image.png"
```
You can also make the image protected, different modes, etc. (you can use true/false as well)
```
draw image at x=123 y=123 path="" protect=yes wars=no force=no mode=FROM_CENTER
```

#### Pixels
```
draw pixel at x=123 y=123 color=RED
```
They also have settings
```
draw pixel at x=123 y=123 color=RED brush=1 protect=yes wars=no force=no
```

#### Text
```
draw text "My Text" at x=123 y=123
```
They have a lot of settings
```
draw text "My Text" at x=123 y=123 with font "SMALL_FONT" and textColor=1 "backgroundColor", "fillColor", "spaceLength", "separatorLength", "lineGap", "protect", "wars", "force"
```

#### Variables
Variables can be set with `set` command
```
set x=1 y=2 path="flag.png"
```
And can be used like this; removing the = will make var=var so x=x and y=y here. Surround in {} for strings.
```
draw image at x y path="/usr/Downloads/{path}"
```

#### Sleep
You can wait milliseconds by using `sleep`
```
print "Hi"
sleep 1000
print "World"
```

#### Speed
You can change the placing speed with `speed`, this is in MS
```
speed 16
```
You can change specific bot speeds too
```
speed 16 bot="fast bot"
speed 20 bot="slow bot"
```
The default placing speed of PPJS is 14ms with load barriers of +1 +2 +3 so it'll max around 17ms under sustained load.

#### Loops
Loops can be done like this
```
repeat 5 times:
    print "{index}"
end
```
You can also use variables in them with this syntax
```
repeat number0=variable
    print "{index}"
end
```
Or infinitely like this
```
repeat forever:
    print "FOREVER!"
end
```
This will stop the rest of the bot ^^^ so you should use `sleep` between each, and run it async if you have operations after it
```
async
    repeat forever:
        print "{index}"
        sleep 100
    end
end
```
They can be exited with `break` (this is kinda useless until i implement conditional statements but shh)
```
repeat 10 times
    sleep 1000
    break
end
```

#### Debug
You can add a debugger like this. It will default to the first bot if unspecified.
```
debug
```
This has a few options for it too<br>
`ignorePixelPacket` will skip printing pixel packet<br>
`shrinkPixelPacket` will shrink the packet to 60 chars<br>
`lineClears` will clear the console line; useful to replace `print` messages<br>
```
debug bot="botname" ignorePixelPacket=yes shrinkPixelPacket=yes lineClears=yes
```

#### Javascript
If you need some js things like math and stuff you can use the js() function
```
set x=js("5 + 10")
print "{x}"
```

## PPScript Example
```
bot name="mybot" authKey="..." authToken="..." authId="..."
create

debug ignorePixelPacket=true lineClears=true

login

print "Logged in to PXP!"

async
    repeat forever:
        set x=parts("pixels.placing" object=stats())
        print "{x}" newLine=no lineClear=yes
        sleep 100
    end
end

draw image at x=500 y=500 path="/data/image.png" protect=yes bot="mybot"
```