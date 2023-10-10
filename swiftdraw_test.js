import { PixelPlace, Auth, Modes, Packets } from "./dist/index.js";

(async () => {

    const boardId = 7;

    const auths = [
        new Auth({
            authKey: "4ubedjh2hyyccz3o46smhjpdkmz7yvl9mlhrqtxa15slpumgmm7nm0i485edir21z5ggo3rgyl4wts8wbkmk7rj3q1i3glljvd66v0rr68tbh3z0fokgog54sn7w4s04i9779kbck7jh4y15u7q4pa00h9dexiv1i5jpl8n9z02xpqp4wqojbsa4yfukrha3ktkr2fvbmql83k4ijb1755umasan3n7646360c21hod4278uew3r2ktqvvutz0f",
            authToken: "gmyr9k834ywg68gvplhef4lyhmjvx83c4sb7d0zzq0wpgvf3yj1wkfstmb8eyc9ncg29ztfi9at1xbqzc71vym5k95lphjzwdoz5dzw4n0ibkszdfct3e3ru3l68huzajocl80cd5jqzsil7bxwqzfu68zeofay9b1zvq2r9lydx152q3tztvwrxuoqwv1ihj53suvehd3kym903fadbw3vy5sd6d31zga5tdmqqq84rirmjyh9drbp7feoea5d",
            authId: "2l2tn0g6fas509jvv4r8bgob11kg1ur207mnmorhankjh3ok1674doufeb0r5ofp",
        }, boardId),
    ];

    const pp = new PixelPlace(auths);
    await pp.Init();
    
    console.log("Pixel Place initiated!");

    pp.bots[0].setPlacementSpeed(-99999);

    const [initX, initY] = [1896,446];

    let maxFailures = 20;
    let maxPixels = 3600;
    let prevGoal = 1;

    function e(arg) {
        console.log(pp.bots[0].getStatistics());
        console.log(arg);
        process.exit(0);
    }

    pp.bots[0].on(Packets.RECEIVED.PIXEL, () => {
        const stats = pp.bots[0].getStatistics();
        const placed = stats.pixels.placing.placed;
        if(placed >= prevGoal * 100) {
            prevGoal++;
            console.log(stats);
        }
        if(stats.pixels.placing.failed >= maxFailures) {
            e(`Exit Failure: ${stats.pixels.placing.failed.toLocaleString()}/${maxFailures.toLocaleString()} pixels failed`);
        }
        if(placed >= maxPixels) {
            e(`Exit Size: ${placed.toLocaleString()}/${maxPixels.toLocaleString()} pixels placed`);
        }
        if(stats.images.finished == 1) {
            console.log(stats);
            console.log(`Finished drawing!`);
            setTimeout(process.exit, 1000);
        }
    });

    pp.bots[0].drawImage({+
        x: initX,
        y: initY,
        path: "C:/Users/Zachary/Documents/trans flag PP client.png",
        mode: async (pixels, draw, getColorAt) => {
            let placed = 0;
            let lastFreeze = 0;

            const newDraw = async (x, y) => {
                if(pp.bots[0].getPixelAt(initX + x, initY + y) != getColorAt(x, y, pixels)) {
                    placed++;
                }
                if(placed >= maxPixels) {
                    return;
                }
                draw(x, y, pixels);
                if(placed != lastFreeze && placed % 100 == 0) {
                    await new Promise((resolve, _reject) => setTimeout(resolve, 100));
                    console.log("freeze:", placed)
                    lastFreeze = placed;
                }
            }

            // calculate the center point
            const centerX = Math.floor(pixels.shape[0] / 2);
            const centerY = Math.floor(pixels.shape[1] / 2);

            // create an array to hold pixels and their distances from the center
            let pixelDistances = [];

            // calculate the distance of each pixel from the center
            for (let x = 0; x < pixels.shape[0]; x++) {
                for (let y = 0; y < pixels.shape[1]; y++) {
                    const dx = centerX - x;
                    const dy = centerY - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    pixelDistances.push({x, y, distance});
                }
            }

            //sort the pixels by their distance from the center
            pixelDistances.sort((a, b) => b.distance - a.distance);

            // draw the pixels from the center outward
            for (const pixel of pixelDistances) {
                await newDraw(pixel.x, pixel.y);
            }
        },
        protect: true,
        force: false,
    });
})();