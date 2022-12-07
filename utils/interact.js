import axios from 'axios';
import { Network, Alchemy } from "alchemy-sdk";
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3("https://eth-goerli.g.alchemy.com/v2/CH1V81ZMzVXNjIFWnRNNTTgY0nD_Twh6");

const alchemy = new Alchemy({
    apiKey: "CH1V81ZMzVXNjIFWnRNNTTgY0nD_Twh6",
    network: Network.ETH_GOERLI
});

//collection config
const nftAbi = require("./abi/erc721.json");

//reward config
const tokenABI = require("./abi/token.json");
const tokenContractAddress = "0x62Ec3D22A0555c96Bd79F216483d4044FB69F3Da";
const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);

//staking config
const stakingABI = require("./abi/staking.json");
const stakingContractAddress = "0x527b38320420f38F0d0793F04236f2b01eDAAdeE";
const stakingContract = new web3.eth.Contract(stakingABI, stakingContractAddress);



export const connectWallet = async () => {
    if (window.ethereum) {
        try {
            const addressArray = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            const chainId = await ethereum.request({ method: 'eth_chainId' });

            if(chainId != "0x5"){
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x5' }],
                });
            }
            
            return {
                success: true,
                status: "Connected",
                address: addressArray[0],
            };
        } catch (err) {
            return {
                success: false,
                address: "",
                status: err.message,
            };
        }
    } else {
        return {
            success: false,
            address: "",
            status: "You must install MetaMask, a virtual Ethereum wallet, in your browser.",
        };
    }
};
  
export const getCurrentWalletConnected = async () => {
    if (window.ethereum) {
        try {
            const addressArray = await window.ethereum.request({
                method: "eth_accounts",
            });

            if (addressArray.length > 0) {

                return {
                    address: addressArray[0],
                    status: "connected",
                    success: true,
                };
            } else {
                return {
                    address: "",
                    status: "Connect your wallet",
                    success: false,
                };
            }
        } catch (err) {
            return {
                address: "",
                status: err.message,
                success: false,
            };
        }
    } else {
        return {
            address: "",
            status: "You must install MetaMask, a virtual Ethereum wallet, in your browser.",
            success: false
        };
    }
};


let response = {
    success: false,
    status: ""
};

//start erc721

export const getCollectionInstance = async (contractAddress) => {
    const nftContract = new web3.eth.Contract(nftAbi, contractAddress);
    return nftContract;
};

export const getCollectionName = async (contractAddress) => {
    const result = (await getCollectionInstance(contractAddress)).methods.name().call();
    return result;
};

export const getNftBalance = async (contractAddress, wallectAddress) => {
    const result = (await getCollectionInstance(contractAddress)).methods.balanceOf(wallectAddress).call();
    return result;
};

export const checkApproval = async (contractAddress, wallectAddress) => {
    const result = (await getCollectionInstance(contractAddress)).methods.isApprovedForAll(wallectAddress, stakingContractAddress).call();
    return result;
};

function secondsToTime(secs){
    var hours = Math.floor(secs / (60 * 60));
   
    var divisor_for_minutes = secs % (60 * 60);
    var minutes = Math.floor(divisor_for_minutes / 60);
 
    var divisor_for_seconds = divisor_for_minutes % 60;
    var seconds = Math.ceil(divisor_for_seconds);

    let duration = "";
    if(hours > 0) duration = hours+ " hour(s)";
    if(minutes > 0) duration = minutes+ " minute(s)"
    // if(hours > 24) duration = hours+ " day(s)"
    
    return duration;
}

export const getTokenInformation = async (wallectAddress) => {
    const collectionArr = await getCollectionVault();
    const stakedIdsArr = await getTokenIdsStaked(wallectAddress);
    let itemArray = [];

    for (let j = 0; j < collectionArr.length; j++) {

        const result = await alchemy.nft.getNftsForOwner(wallectAddress, {
            contractAddresses : [collectionArr[j].contractAddress]
        });

        for (let index = 0; index < result.totalCount; index++) {
            // let justRefresh = await axios.get(`https://eth-goerli.g.alchemy.com/nft/v2/CH1V81ZMzVXNjIFWnRNNTTgY0nD_Twh6/getNFTMetadata?contractAddress=0x7F5683E7d88FEFaad727D38408b863811e128B1b&tokenId=${result.ownedNfts[index].tokenId}&tokenType=ERC721&refreshCache=true`).catch(function (error) {
            //     console.log(error.toJSON());
            // });
            let tokenId = result.ownedNfts[index].tokenId;
            let rawImg = result.ownedNfts[index].rawMetadata.image;
            var name = result.ownedNfts[index].rawMetadata.name;
            let image = rawImg.replace('ipfs://', 'https://ipfs.io/ipfs/');
            itemArray.push({
                name: name,
                img: image,
                tokenId: tokenId,
                staked: false,
                cid: j
            });
        }
    }

    //owned nft token from staking contract
    for (let index = 0; index < stakedIdsArr.length; index++) {
        const rawUriS = await (await getCollectionInstance(collectionArr[stakedIdsArr[index].cid].contractAddress)).methods.tokenURI(stakedIdsArr[index].tokenId).call();
        console.log("uri", rawUriS);
        let cleanUriS = rawUriS.replace('ipfs://', 'https://ipfs.io/ipfs/');
        let metadataS = await axios.get(`${cleanUriS}`).catch(function (error) {
            console.log(error.toJSON());
        });
        let rawImgS = metadataS.data.image;
        var nameS = metadataS.data.name;
        let imageS = rawImgS.replace('ipfs://', 'https://ipfs.io/ipfs/'); 
        itemArray.push({
            name: nameS,
            img: imageS,
            tokenId: stakedIdsArr[index].tokenId,
            staked: true,
            cid: stakedIdsArr[index].cid
        });        
    }
    itemArray.sort((a, b) => parseFloat(a.cid) - parseFloat(b.cid));
    return itemArray;
};

export const setApproval = async (contractAddress, wallectAddress) => {
    await (await getCollectionInstance(contractAddress)).methods.setApprovalForAll(stakingContractAddress, true)
    .send({
      from: wallectAddress,
      to: contractAddress
    })
    .then(function(receipt){
      console.log("receipt: ", receipt);
      response.success = true;
      response.status = "Approved successfully"
    }).catch(function(error){
      console.log("error: ", error);
      response.success = false;
      response.status = "Something went wrong";
    });
  
    return response;
};


export const mintNFT = async (contractAddress, wallectAddress) => {
    await (await getCollectionInstance(contractAddress)).methods.publicMint(5)
    .send({
      from: wallectAddress,
      to: contractAddress
    })
    .then(function(receipt){
      console.log("receipt: ", receipt);
      response.success = true;
      response.status = "Mint successfully"
    }).catch(function(error){
      console.log("error: ", error);
      response.success = false;
      response.status = "Something went wrong";
    });
  
    return response;
};

//end erc721


//start erc20


export const getTokenBalance = async (wallectAddress) => {
    const result = await tokenContract.methods.balanceOf(wallectAddress).call();
    const resultEther = web3.utils.fromWei(result, "ether");
    return resultEther;
};


//enderc20



//start staking

export const getEarnings = async (wallectAddress) => {
    const result = await stakingContract.methods.earnings(wallectAddress).call();
    const resultEther = web3.utils.fromWei(result, "ether");
    return resultEther;
};

const getTokenStakedBalance = async (wallectAddress) => {
    const result = await stakingContract.methods.balanceOf(wallectAddress).call();
    return result;
}

const getTokenIdsStaked = async (wallectAddress) => {
    const bal = await getTokenStakedBalance(wallectAddress);
    const resultArr = await stakingContract.methods.tokenOfOwnerStaked(wallectAddress).call();
    let tokens =[];
    for (let index = 0; index < bal; index++) {
        tokens.push({
            tokenId : resultArr[index].tokenId,
            cid: resultArr[index].cid
        })
    }
    return tokens;
};


export const getCollectionVault = async () => {
    const totalCollection = await stakingContract.methods.totalCollection().call();
    let allCollection = [];
    for (let index = 0; index < totalCollection; index++) {
        let collectionInfo = await stakingContract.methods.collections(index).call();
        let name = await getCollectionName(collectionInfo.nftCollection);
        allCollection.push({
            name: name,
            stakers: Number(collectionInfo.amountOfStakers),
            contractAddress : collectionInfo.nftCollection,
            reward : Number(web3.utils.fromWei(collectionInfo.rewards, 'ether')),
            duration: secondsToTime(collectionInfo.stakeDuration)
        });
    }
    return allCollection;
};

export const claimReward = async (wallectAddress) => {
    await stakingContract.methods.claimRewards()
    .send({
      from: wallectAddress,
      to: stakingContractAddress
    })
    .then(function(receipt){
      console.log("receipt: ", receipt);
      response.success = true;
      response.status = "Rewards claimed";
    }).catch(function(error){
      console.log("error: ", error);
      response.success = false;
      response.status = "Something went wrong";
    });
    return response;
};


export const stakeNFT = async (index, tokens, wallectAddress) => {
    await stakingContract.methods.batchStake(index, tokens)
    .send({
      from: wallectAddress,
      to: stakingContractAddress
    })
    .then(function(receipt){
      console.log("receipt: ", receipt);
      response.success = true;
      response.status = "Staked successfully";
    }).catch(function(error){
      console.log("error: ", error);
      response.success = false;
      response.status = "Something went wrong";
    });
    return response;  
};

export const unStakeNFT = async (index, tokens, wallectAddress) => {
    await stakingContract.methods.batchUnstake(index, tokens)
    .send({
      from: wallectAddress,
      to: stakingContractAddress
    })
    .then(function(receipt){
      console.log("receipt: ", receipt);
      response.success = true;
      response.status = "Unstacked successfully";
    }).catch(function(error){
      console.log("error: ", error);
      response.success = false;
      response.status = "Something went wrong";
    });
    return response;
};


//end staking

export {
    getTokenIdsStaked,
    getTokenStakedBalance
}