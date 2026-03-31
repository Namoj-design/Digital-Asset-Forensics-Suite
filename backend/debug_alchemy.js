import { rpcFetch } from './api.js';

async function test() {
    const address = "0x00000000219ab540356cbb839cbe05303d7705fa";
    try {
        console.log("Fetching outbound...");
        const outRes = await rpcFetch("ethereum", "alchemy_getAssetTransfers", [{ fromBlock: "0x0", toBlock: "latest", fromAddress: address, category: ["external", "erc20"], maxCount: "0x19" }]);
        console.log("Out:", outRes);

        console.log("Fetching inbound...");
        const inRes = await rpcFetch("ethereum", "alchemy_getAssetTransfers", [{ fromBlock: "0x0", toBlock: "latest", toAddress: address, category: ["external", "erc20", "internal"], maxCount: "0x19" }]);
        console.log("In:", inRes);
    } catch (err) {
        console.error("rpcFetch ERR:", err);
    }
}
test();
