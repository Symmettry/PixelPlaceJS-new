# ppjs-new
PixelPlace JS v2 basically

https://www.npmjs.com/package/pixelplacejs-new

Extremely versatile NodeJS library for pixelplace.

Easily capable of drawing 3000x3000 images (May have a delay on hefty sorting like FROM_CENTER or TO_CENTER)

Able to do many many things unlike most bots (Like chat bots -- Erebot is made in this)

[View Documentation](https://symmettry.github.io/PixelPlaceJS-new/)

### Full Bot

```js
import { PixelPlace, Auth, Modes, Packets, Colors, Errors } from "pixelplacejs-new";

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

    // 16 ms between each pixel (Default rate)
    pp.bots[0].setPlacementSpeed(pp.bots[0].rate);

    // draws image at path "C:/my image.png" (will throw an error if it doesn't exist)
    await pp.bots[0].drawImage(x, y, "C:/my image.png", Modes.FROM_CENTER);

    // places a 10x10 area of white (You should probably remove this; it's just an example)
    for(var x=0;x<10;x++) {
        for(var y=0;y<10;y++) {
            await pp.bots[0].placePixel(1000 + x, 1000 + y, Colors.WHITE);
        }
    }
})();

```
