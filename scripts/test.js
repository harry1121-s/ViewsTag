const { expect } = require("chai");
const { ethers } = require("hardhat");
var fs = require('fs');
const { start } = require("repl");
const { defaultAccounts } = require("ethereum-waffle");
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");


describe("Viewstag_ICO", function () {

    let start, end;
    
    const advanceBlock = () => new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: new Date().getTime(),
        }, async (err, result) => {
            if (err) { return reject(err) }
            // const newBlockhash =await web3.eth.getBlock('latest').hash
            return resolve()
        })
    })
    
    const advanceBlocks = async (num) => {
        let resp = []
        for (let i = 0; i < num; i += 1) {
            resp.push(advanceBlock())
        }
        await Promise.all(resp)
    }
    
    const advancetime = (time) => new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            id: new Date().getTime(),
            params: [time],
        }, async (err, result) => {
            if (err) { return reject(err) }
            const newBlockhash = (await web3.eth.getBlock('latest')).hash
    
            return resolve(newBlockhash)
        })
    })

    before(async () => {

        const myToken = await ethers.getContractFactory("myToken");
        mytoken = await myToken.deploy();
        await mytoken.deployed();

        const PreSale = await ethers.getContractFactory("Presale");
        presale = await PreSale.deploy(mytoken.address, [0, 1, 2, 3, 4, 5], [15, 15, 5, 100, 100, 5], [3, 3, 12, 12, 6, 12]);	
        await presale.deployed();


        accounts = await ethers.getSigners();

        start = 7 * 24 * 60 * 60;
        end = 14 * 24 * 60 * 60;
        // lock1 = 21 * 24 * 60 * 60;
        // lock2 = 28 * 24 * 60 * 60;

        const blockNumBefore = await ethers.provider.getBlockNumber();
        const blockBefore = await ethers.provider.getBlock(blockNumBefore);
        timestamp = blockBefore.timestamp;
    });

    it("Should check for Contract's ownership", async function(){

        expect(await presale.owner()).to.equal(accounts[0].address);
        expect(await mytoken.owner()).to.equal(accounts[0].address);

    });
    
    

    it("Should set correct Params for the PreSale contract", async function(){


        vestingDetails = await presale.roundDetails(0);
        expect(vestingDetails.vestingPercent).to.equal(15)
        expect(vestingDetails.lockingPeriod).to.equal(3)
        
        //set sale time
        await presale.setSalePeriodParams(
            timestamp + start,
            timestamp + end,
            );
        
        
        await mytoken.approve(presale.address, "20000000000000000000000000");
        await expect(presale.setSaleTokenParams("20000000000000000000000000", String(10**18), 2)).to.be.revertedWith("VTG Presale: Round ID should be 0 or 1")
        await presale.setSaleTokenParams("20000000000000000000000000", String(10**18), 0);

        expect(await mytoken.balanceOf(presale.address)).to.equal("20000000000000000000000000")
        expect(await presale.currentRound()).to.equal(0)
        
        await expect(presale.setVestingPeriod()).to.be.revertedWith("VTG: Sale in progress")
        
        contractBal = await mytoken.balanceOf(presale.address);
        saleTokens = await presale.totalTokensforSale();
        startTime = await presale.preSaleStartTime();
        endTime = await presale.preSaleEndTime();

        
        tokenAmt = await presale.getTokenAmount(String(10**17))

        expect(String(saleTokens)).to.equal(String(contractBal));
        expect(String(startTime)).to.equal(String(timestamp + start));
        expect(String(endTime)).to.equal(String(timestamp + end));
        // expect(String(lockTime1)).to.equal(String(timestamp + lock1));
        // expect(String(lockTime2)).to.equal(String(timestamp + lock2));
        // expect(String(lockRate)).to.equal(String(30));

        expect(tokenAmt).to.equal(String(10**17))

    });


    it("Should not allow users to buy Sale Token.", async function(){

        accountA = accounts[1];
        accountB = accounts[2];
        accountC = accounts[4];

    
        await expect(presale.connect(accountA).buyToken(false, {value: ethers.utils.parseEther("1.0")}))
        .to.be.revertedWith("Presale: Sale hasn't started");

    });


    it("Should fail in setting Sale Period Params.", async function(){

        await expect(presale.connect(accounts[1]).setSalePeriodParams(
            timestamp - start,
            timestamp + end,
            )).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(presale.setSalePeriodParams(
            timestamp - start,
            timestamp + end,
            )).to.be.revertedWith("PreSale: Invalid PreSale Date!");
        
        
        await advancetime(8 * 24 * 60 * 60);
        await advanceBlock();

        await expect(presale.setSalePeriodParams(
            timestamp + start + 1 * 24 *60 * 60,
            timestamp + end,
           )).to.be.revertedWith("PreSale: Sale has already started!");

        // await mytoken.approve(presale.address, 400000);
        await expect(presale.setSaleTokenParams("20000000000000000000000000", String(10**18), 0))
        .to.be.revertedWith("PreSale: Sale has already started!");

    });
    
    it("Should set external vesting", async function(){

        team = [accountB.address, accounts[4].address, accounts[5].address, accounts[6].address, accounts[7].address]
        amount = [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0"), ethers.utils.parseEther("3.0"), ethers.utils.parseEther("4.0"), ethers.utils.parseEther("5.0")]
        await expect(presale.setExternalAllocation(
            team, amount, 2
        )).to.be.revertedWith("VTG: Id should be greater than 1")
        await mytoken.approve(presale.address, ethers.utils.parseEther("15.0"))
        await presale.setExternalAllocation(
            team, amount, 3
        )
        // [0, 1, 2, 3, 4, 5], [15, 15, 5, 100, 100, 5], [3, 3, 12, 12, 6, 12]


        //checking external vesting
        
        for(i = 0; i< team.length; i++){
            var1 = await presale.getTokensBought(team[i])
            var2 = await presale.getRoundsParticipated(team[i])
            var3 = await presale.getTokensPerRound(team[i],3)
            var4 = await presale.getClaimedTokensPerRound(team[i],3)
            var5 = await presale.getMonthlyVestingClaimed(team[i], 3)

            console.log(var1, "\n", var2, "\n", var3, "\n", var4, "\n", var5, "EOL\n\n\n\n")
        }
    })
    
    it("Should allow users to buy Sale Token.", async function(){

        await advancetime(2 * 24 * 60 * 60);
        await advanceBlock();
        
        await presale.connect(accountA).buyToken(false, {value: ethers.utils.parseEther("1.0")})
        tokensA = await presale.getTokensBought(accountA.address)
        // console.log(tokensA)
        roundsA = await presale.getRoundsParticipated(accountA.address)
        // console.log(roundsA)
        tokensPerRoundA = await presale.getTokensPerRound(accountA.address, 0)
        // console.log(tokensPerRoundA)
        claimedTokensA = await presale.getClaimedTokensPerRound(accountA.address, 0)
        // console.log(claimedTokensA)
        claimedTokensA = await presale.getTotalClaimedTokens(accountA.address)
        // console.log(claimedTokensA)


        await presale.connect(accountB).buyToken(false, {value: ethers.utils.parseEther("1.1")})
        await presale.connect(accountB).buyToken(true, {value: ethers.utils.parseEther("0.5")})
        
        tokensB = await presale.getTokensBought(accountB.address)
        expect(tokensB).to.equal(ethers.utils.parseEther("2.6"))
        roundsB = await presale.getRoundsParticipated(accountB.address)
        console.log(roundsB)
        tokensPerRoundB = await presale.getTokensPerRound(accountB.address, 0)
        expect(tokensPerRoundB).to.equal(ethers.utils.parseEther("1.1"))
        tokensPerRoundB = await presale.getTokensPerRound(accountB.address, 2)
        expect(tokensPerRoundB).to.equal(ethers.utils.parseEther("0.5"))
        tokensPerRoundB = await presale.getTokensPerRound(accountB.address, 1)
        expect(tokensPerRoundB).to.equal(0)

        claimedTokensB = await presale.getClaimedTokensPerRound(accountB.address, 0)
        console.log(claimedTokensB)
        claimedTokensB = await presale.getTotalClaimedTokens(accountB.address)
        console.log(claimedTokensB)
        

    });

    it("Should not allow users to buy Sale Token after sale has ended.", async function(){

        await advancetime(10 * 24 * 60 * 60);
        await advanceBlock();
        await expect(presale.connect(accountA).buyToken(false, {value: ethers.utils.parseEther("1.0")}))
        .to.be.revertedWith("PreSale: Sale has already ended");

    });

    it("Should set vesting begin time", async function(){
        await presale.setVestingPeriod()
        await advancetime(20 * 24 * 60 * 60);
        await advanceBlock();

    })

    it("Should get available allocation for the user", async function(){

        await advancetime(70 * 24 * 60 * 60);
        await advanceBlock();
        allocA = await presale.getAllocation(accountA.address);
        console.log(allocA, "allocation after unlock")
    
        allocB = await presale.getAllocation(accountB.address);
        console.log(allocB, "allocation after unlock")

    })
    
    it("Should get external allocation", async function(){

        team = [accountB.address, accounts[4].address, accounts[5].address, accounts[6].address, accounts[7].address]
        alloc1 = await presale.getAllocation(team[1])
        expect(alloc1).to.equal(0)
    })
    it("Should allow users to withdraw Sale Token.", async function(){

        
        await presale.connect(accountA).withdrawToken();
        await presale.connect(accountB).withdrawToken();
        
        return

        balA = await mytoken.balanceOf(accountA.address)
        balB = await mytoken.balanceOf(accountB.address)
        console.log(balA, balB);
        
        claimedTokensA = await presale.getTotalClaimedTokens(accountA.address)
        expect(claimedTokensA).to.equal(balA)
        claimedTokensB = await presale.getTotalClaimedTokens(accountB.address)
        expect(claimedTokensB).to.equal(balB)
        
        
        // await advancetime(60 * 24 * 60 * 60);
        // await advanceBlock();
        
        allocA = await presale.getAllocation(accountA.address);
        console.log(allocA, "allocation after withdraw")
        allocB = await presale.getAllocation(accountB.address);
        console.log(allocB, "allocation after withdraw")
        
        await advancetime(30 * 24 * 60 * 60);
        await advanceBlock();

        allocA = await presale.getAllocation(accountA.address);
        console.log(allocA, "allocation after 4th month")
        allocB = await presale.getAllocation(accountB.address);
        console.log(allocB, "allocation after 4th month")

        await presale.connect(accountA).withdrawToken();
        await presale.connect(accountB).withdrawToken();
        

        balA = await mytoken.balanceOf(accountA.address)
        balB = await mytoken.balanceOf(accountB.address)
        
        
        claimedTokensA = await presale.getTotalClaimedTokens(accountA.address)
        expect(claimedTokensA).to.equal(balA)
        claimedTokensB = await presale.getTotalClaimedTokens(accountB.address)
        expect(claimedTokensB).to.equal(balB)
        
        allocA = await presale.getAllocation(accountA.address);
        expect(allocA).to.equal(0)
        allocB = await presale.getAllocation(accountB.address);
        expect(allocB).to.equal(0)

        await advancetime(365 * 24 * 60 * 60);
        await advanceBlock();

        allocA = await presale.getAllocation(accountA.address);
        console.log(allocA, "allocation after lot of time")
        allocB = await presale.getAllocation(accountB.address);
        console.log(allocB, "allocation after lot of time")

        await presale.connect(accountA).withdrawToken();
        await presale.connect(accountB).withdrawToken();
        

        balA = await mytoken.balanceOf(accountA.address)
        balB = await mytoken.balanceOf(accountB.address)
        
        
        claimedTokensA = await presale.getTotalClaimedTokens(accountA.address)
        expect(claimedTokensA).to.equal(balA)
        claimedTokensB = await presale.getTotalClaimedTokens(accountB.address)
        expect(claimedTokensB).to.equal(balB)
        
        console.log(claimedTokensB, "mytoken balance of B")

        // allocA = await presale.getAllocation(accountA.address);
        // console.log(allocA, "allocation after lot of time")
        allocB = await presale.getAllocation(accountB.address);
        console.log(allocB, "allocation after lot of time")

        await advancetime(700 * 24 * 60 * 60);
        await advanceBlock();

        await expect(presale.connect(accountA).withdrawToken())
        .to.be.revertedWith("VTG Token Vesting: No VTG Tokens available for claim!");
        await presale.connect(accountB).withdrawToken();

        balB = await mytoken.balanceOf(accountB.address)

        claimedTokensB = await presale.getTotalClaimedTokens(accountB.address)
        expect(claimedTokensB).to.equal(balB)
        console.log(claimedTokensB, "mytokens of B")
        
    });
    
    it("Should allow Owner to withdraw funds", async function(){

        // console.log(await web3.eth.getBalance(presale.address));
        console.log(await presale.getCurrencyBalance())

        ownerBal = await web3.eth.getBalance(presale.address);

        expect(String(ownerBal)).to.equal(await presale.getCurrencyBalance());

        bal1 = await web3.eth.getBalance(await presale.owner());
        await presale.withdrawCurrency(ownerBal);
        bal2 = await web3.eth.getBalance(await presale.owner());
        console.log(String(bal2-bal1))
        console.log(ownerBal)
        

    });

    it("Should withdraw the pending sale tokens", async function(){

        bal = await mytoken.balanceOf(presale.address)
        ownerBal = await mytoken.balanceOf(accounts[0].address)

        await presale.withdrawUnsoldTokens()
        bal2 = await mytoken.balanceOf(presale.address)
        ownerBal2 = await mytoken.balanceOf(accounts[0].address)
        console.log(ownerBal2-ownerBal)
        // expect(bal-bal2).to.be.closeTo(ownerBal2-ownerBal, 10**12)
        
    })


});