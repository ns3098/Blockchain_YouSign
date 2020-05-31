import Web3 from "web3";
import Torus from "@toruslabs/torus-embed";

const getWeb3 = () =>
  new Promise(async (resolve, reject) => {

    let web3Obj = {
      web3: null,
      torus: null
    };

    const torus = new Torus({
      buttonPosition: "top-left"
    });
    await torus.init({
      buildEnv: "production",
      enableLogging: true,
      network: {
        host: "rinkeby"
      },
      showTorusButton: false
    });
    try {
      await torus.login();

      const web3 = new Web3(torus.provider);
      const info = await torus.getUserInfo();

      window.sessionStorage.setItem('torusLogged', 1);
      window.sessionStorage.setItem('username', info.name);
      window.sessionStorage.setItem('userImage', info.profileImage);

      web3Obj.web3 = web3;
      web3Obj.torus = torus;

      resolve(web3Obj);
    } catch (err) {
      reject(err);
    }
  });

export default getWeb3;