import { PixelPlace, Auth, Modes, Packets } from "pixelplacejs-new";

(async () => {

    const boardId = 81792;

    const auths = [
        new Auth({
            authKey: "gpf0auyrb4ld02an6cnfen1zbg9e4imepgq6x66q5a8kxwnfg4j6ng7iyoba6ifbboyt1vu42op3tx6d8wjs3v9yzsq9fse3d4mu7biprsk7r71z0gyhsc4whvti7th4lmvyq7ix181ysv3gdv4jtvnba52w8vxwal5g5lxg897gro4lj6mkpdyd9olrphab1lri6uqxsb4ocqdxrjmk1zwjg2o3c45n9zvaxaxz4titfzhc99z2a6obj9ypu1f",
            authToken: "iyi5is1ygtly0pv99mjb9rk5os5vrvsk1ubifmvheayv8c6gfq092ph5r8j0qyexnsum5a6wyd7gv2tit162rx2hyplmx0hkyv6zt7an55qnqrxipvnm0fbzxl25tgk8cvfnbg1lxrobk08epaswu6kk9zqnqfhgwep5ykvn1hzmai0gjgj6k9niece08qdrm4f26f6diqslsyxwjsgkr30cjduo7th73by0qvoj670kbdqipxgby34awowbhij",
            authId: "ktsnvj887c71nsun5b88ngo03hmoksbgs5gt3tc57e8e8qd76fglg6mvdc5ta700",
        }, boardId),
    ];

    const pp = new PixelPlace(auths);
    await pp.Init();
    
    console.log("Pixel Place initiated!");

    pp.bots[0].setPlacementSpeed(-99999);

    var [x, y] = [0,233];

    const path = "C:/Users/Zachary/Downloads/fat guy.png";

    const checkerBoard1 = (async (pixels, draw) => {
        let defX = 0;
        for (let y = 0; y < pixels.shape[1]; y++) {
            for (let x = defX; x < pixels.shape[0]; x+=2) {
                await draw(x, y, pixels);
            }
            defX = defX == 0 ? 1 : 0;
        }
        defX = 1;
        for (let y = 0; y < pixels.shape[1]; y++) {
            for (let x = defX; x < pixels.shape[0]; x+=2) {
                await draw(x, y, pixels);
            }
            defX = defX == 0 ? 1 : 0;
        }
    });
    const checkerBoard2 = (async (pixels, draw) => {
        let defX = 0;
        for (let y = pixels.shape[1]; y > 0; y--) {
            for (let x = defX; x < pixels.shape[0]; x+=2) {
                await draw(x, y, pixels);
            }
            defX = defX == 0 ? 1 : 0;
        }
        defX = 1;
        for (let y = pixels.shape[1]; y > 0; y--) {
            for (let x = defX; x < pixels.shape[0]; x+=2) {
                await draw(x, y, pixels);
            }
            defX = defX == 0 ? 1 : 0;
        }
    });

    const drawImagePromises = [
        pp.bots[0].drawImage({ x: x, y: y, path: path, mode: Modes.FROM_CENTER, protect: true, force: false, }),
        pp.bots[0].drawImage({ x: x, y: y, path: path, mode: checkerBoard1, protect: true, force: false, }),
        pp.bots[0].drawImage({ x: x, y: y, path: path, mode: checkerBoard2, protect: true, force: false, }),
    ];

    var prevGoal = 1;

    var maxFailures = 20;
    var maxPixels = 2500;

    function e(arg) {
        console.log(pp.bots[0].getStatistics());
        console.log(arg);
        process.exit(0);
    }

    pp.bots[0].on(Packets.RECEIVED.PIXEL, () => {
        const stats = pp.bots[0].getStatistics();
        const placed = stats.pixels.placing.placed;
        if(placed > prevGoal * 100) {
            prevGoal++;
            console.log(stats);
        }
    });

    setInterval(() => {
        const stats = pp.bots[0].getStatistics();
        const placed = stats.pixels.placing.attempted;
        if(stats.pixels.placing.failed > maxFailures) {
            e(`Exit Failure: ${stats.pixels.placing.failed.toLocaleString()}/${maxFailures.toLocaleString()} pixels failed`);
        }
        if(placed > maxPixels) {
            e(`Exit Size: ${placed.toLocaleString()}/${maxPixels.toLocaleString()} pixels placed`);
        }
        if(stats.images.finished == 3) {
            e("Exit Finish: Finished drawing");
        }
    }, 10);

    await Promise.all(drawImagePromises);

})();