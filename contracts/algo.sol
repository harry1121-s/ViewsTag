// pragma solidity 0.8.9;
// contract pre{

//     constructor(){
//         setRoundDetails([0, 1, 2, 3, 4, 5], [15, 15, 5, 100, 100, 5], [3, 3, 12, 12, 6, 12]);
//     }

//     modifier saleStarted(){
//     if(preSaleStartTime != 0){
//         require(block.timestamp < preSaleStartTime || block.timestamp > preSaleEndTime, "PreSale: Sale has already started!");
//     }
//         _;
//     }

//   //modifier to check if the sale is active or not
//     modifier saleDuration(){
//         require(block.timestamp > preSaleStartTime, "Presale: Sale hasn't started");
//         require(block.timestamp < preSaleEndTime, "PreSale: Sale has already ended");
//         _;
//     }

//   //modifier to check if the Sale Duration and Locking periods are valid or not
//     modifier saleValid(
//     uint256 _preSaleStartTime, uint256 _preSaleEndTime
//     ){
//         require(block.timestamp < _preSaleStartTime, "PreSale: Invalid PreSale Date!");
//         require(_preSaleStartTime < _preSaleEndTime, "PreSale: Invalid PreSale Dates!");
//         _;
//     }

//     struct VestingDetails{
//         uint256 vestingPercent;
//         uint256 lockingPeriod;
//     }

//     uint256 public currentRound = 1000;

//     mapping (uint256 => VestingDetails) public roundDetails;

//     //0: PS1, 1: PS2, 2:INNOVATION, 3: TEAM, 4:MARKETING, 5: SEED
//     struct BuyerTokenDetails {
//         uint256 totalAmount;
//         uint256 []roundsParticipated;
//         mapping(uint256 => uint256)tokensPerRound;
//         mapping(uint256 => uint256)monthlyVestingClaimed;
//         mapping(uint256 => uint256)tokensClaimed;
//     }

//     mapping(address => BuyerTokenDetails) public buyersAmount;

//     function setRoundDetails(uint256[] memory _roundID, uint256[] memory _vestingPercent, 
//     uint256[] memory _lockingPeriod)internal{

//         require(_roundID.length == _vestingPercent.length, "VTG: Length mismatch");
//         require(_lockingPeriod.length == _vestingPercent.length, "VTG: Length mismatch");

//         for(uint256 i = 0; i < _roundID.length; i++){
//             roundDetails[_roundID[i]].vestingPercent = _vestingPercent[i];
//             roundDetails[_roundID[i]].lockingPeriod = _lockingPeriod[i];
//         }
//     }

//     function setSaleTokenParams(
//     uint256 _totalTokensforSale, uint256 _rate, uint256 _roundID
//     )external onlyOwner saleStarted{
//         require(_rate != 0, "PreSale: Invalid Native Currency rate!");
//         require(_roundID < 2, "VTG Presale: Round ID should be 0 or 1");
//         currentRound = _roundID;
//         rate = _rate;
//         totalTokensforSale = _totalTokensforSale;
//         totalTokensSold = 0;
//         IERC20Metadata(saleToken).safeTransferFrom(msg.sender, address(this), totalTokensforSale);
//     }

//     function setSalePeriodParams(
//     uint256 _preSaleStartTime,
//     uint256 _preSaleEndTime,
//     )external onlyOwner saleStarted saleValid(_preSaleStartTime, _preSaleEndTime){
//         preSaleStartTime = _preSaleStartTime;
//         preSaleEndTime = _preSaleEndTime;
//     }

//     function setVestingPeriod()external onlyOwner{
//         require(vestingBeginTime == 0, "VTG: Cannot set multiple times");
//         vestingBeginTime = block.timestamp;
//     }

//     function buyToken(bool _isInnovation) external payable saleDuration{
//         uint256 saleTokenAmt;

//         saleTokenAmt = (msg.value).mul(10**saleTokenDec).div(rate);
//         require((totalTokensSold + saleTokenAmt) < totalTokensforSale, "PreSale: Total Token Sale Reached!");

//         // Update Stats
//         totalTokensSold = totalTokensSold.add(saleTokenAmt);

//         buyersAmount[msg.sender].totalAmount += saleTokenAmt;
//         if(buyersAmount[msg.sender].tokensPerRound[currentRound] == 0){
//             buyersAmount[msg.sender].roundsParticipated.push(currentRound);
//             buyersAmount[msg.sender].monthlyVestingClaimed[currentRound] = roundDetails[currentRound].lockingPeriod;

//         }
//         buyersAmount[msg.sender].tokensPerRound[currentRound] += saleTokenAmt;

//     }

//     function withdrawToken()external{
//         uint256 tokensforWithdraw = getAllocation(msg.sender);
//         require(tokensforWithdraw > 0, "VTG Token Vesting: No VTG Tokens available for claim!");
//         IERC20Metadata(saleToken).safeTransfer(msg.sender, tokensforWithdraw);
//         uint256 timeElapsed = block.timestamp.sub(vestingBeginTime);
//         uint256 boost;
//         uint256 availableAllocation;
//         uint256 round;
//         for(uint256 i = 0; i < buyersAmount[user].roundsParticipated.length; i++){
//             round = buyersAmount[user].roundsParticipated[i];
//             if(timeElapsed.div(30*24*60*60) >= roundDetails[round].lockingPeriod){
//                 boost = timeElapsed.div(30*24*60*60).sub(buyersAmount[user].monthlyVestingClaimed[round]);
//                 buyersAmount[user].tokensClaimed[round] += buyersAmount[user].tokensPerRound[round].mul(boost).mul(roundDetails[round].vestingPercent).div(100);
//             }
//         }
//         buyersAmount[msg.sender].monthlyVestingClaimed[round] = timeElapsed.div(30*24*60*60);
//     }

//     function getAllocation(address user)public returns(uint256){

//         require(vestingBeginTime != 0, "VTG: Vesting hasn't started");        
//         uint256 timeElapsed = block.timestamp.sub(vestingBeginTime);
//         uint256 boost;
//         uint256 availableAllocation;
//         uint256 round;
//         for(uint256 i = 0; i < buyersAmount[user].roundsParticipated.length; i++){
//             round = buyersAmount[user].roundsParticipated[i];
//             if(timeElapsed.div(30*24*60*60) >= roundDetails[round].lockingPeriod){
//                 boost = timeElapsed.div(30*24*60*60).sub(buyersAmount[user].monthlyVestingClaimed[round]);
//                 availableAllocation += buyersAmount[user].tokensPerRound[round].mul(boost).mul(roundDetails[round].vestingPercent).div(100);
//             }
//         }

//         if(availableAllocation > buyersAmount[user].tokensPerRound[round].sub(buyersAmount[user].tokensClaimed[round])){
//           return buyersAmount[user].tokensPerRound[round].sub(buyersAmount[user].tokensClaimed[round]);
//         }
//         else{
//           return availableAllocation;
//         }
//     }

//     function setExternalAllocation(address[] calldata _user, uint256[] calldata _amount, uint256 _roundID)external onlyOwner{

//         uint256 totalTokens;
//         require(_user.length == _amount.length, "VTG Token Vesting: user & amount arrays length mismatch");
//         require(_roundID >=2, "VTG: Id should be greater than 1");
//         for(uint256 i = 0; i < _user.length; i+=1){
//             buyersAmount[_user[i]].totalAmount += _amount[i];
//             if(buyersAmount[_user[i]].tokensPerRound[_roundID] == 0){
//                 buyersAmount[_user[i]].roundsParticipated.push(_roundID);
//                 buyersAmount[_user[i]].monthlyVestingClaimed[_roundID] = roundDetails[_roundID].lockingPeriod;
//             }
//             buyersAmount[_user[i]].tokensPerRound[_roundID] += saleTokenAmt;
//             totalTokens += _amount[i];
//         }
//         IERC20Metadata(saleToken).safeTransferFrom(msg.sender, address(this), totalTokens);
//     }
// }