//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PaymentV1 is ReentrancyGuard {
    uint public nextPlanId;
    struct Plan {
      address merchant;
      uint amount;
      string description;
      uint frequency;
    }

    struct Subscription {
      address subscriber;
      uint start;
      uint nextPayment;
      uint cicles;
    }

    Plan[] public plans;
    mapping(address => mapping(uint => Subscription)) public subscriptions;

    event PlanCreated(address merchant, uint planId, uint date, uint frequency);
    event SubscriptionCreated(address subscriber, uint planId, uint date, uint cicles);
    event SubscriptionCancelled(address subscriber, uint planId, uint date, uint cicles);
    event PaymentReceived(address from, uint amount, uint planId, uint date, uint cicles);
    event PaymentSent(address from, address to, uint amount, uint planId, uint date, uint cicles);

    fallback() external payable {}
    receive() external payable {}

    function createPlan(uint _amount, string calldata _description, uint _frequency) external {
      require(_amount > 0, "amount needs to be > 0");
      require(_frequency > 0, "frequency needs to be > 0");
      plans.push(Plan(msg.sender, _amount, _description, _frequency));
      nextPlanId = plans.length;
      emit PlanCreated(msg.sender, nextPlanId-1, block.timestamp, _frequency);
    }

    function subscribe(uint _planId, uint _cicles) external nonReentrant() payable {
      bool isValid = _planId < plans.length && _planId >= 0;
      require(isValid, "id not in range");
      Plan storage plan = plans[_planId];
      require(plan.amount * _cicles == msg.value, "value must be equal subscription time");
      
      subscriptions[msg.sender][_planId] = Subscription(msg.sender, block.timestamp, block.timestamp+plan.frequency, _cicles);
      
      emit SubscriptionCreated(msg.sender, _planId, block.timestamp, _cicles);
      emit PaymentReceived(plan.merchant, plan.amount, _planId, block.timestamp, _cicles);
      
    }

    function cancel(uint _planId) external nonReentrant() payable {
      Plan storage plan = plans[_planId];
      Subscription storage subscription = subscriptions[msg.sender][_planId];
      require(subscription.subscriber != address(0), "address cannot be null");

      //Pay the merchant if he didn't get the payment
      if(block.timestamp > subscription.nextPayment){
          uint totalAmount = plan.amount * subscription.cicles;
          uint payCicles;
          while(block.timestamp > subscription.nextPayment && subscription.cicles > 0){
            payCicles++;
            subscription.nextPayment = subscription.nextPayment + plan.frequency;
            subscription.cicles--; 
          }
          uint payAmount = plan.amount * payCicles;
          uint sentAmount = totalAmount - payAmount;

          payable(msg.sender).transfer(sentAmount);
          emit PaymentSent(address(this), msg.sender, sentAmount, _planId, block.timestamp, subscription.cicles);
          payable(plan.merchant).transfer(payAmount);
          emit PaymentSent(address(this), plan.merchant, payAmount, _planId, block.timestamp, payCicles);
      }else{
        uint sentAmount = plan.amount*subscription.cicles;
        payable(msg.sender).transfer(sentAmount);
        emit PaymentSent(address(this), msg.sender, sentAmount, _planId, block.timestamp, subscription.cicles);
      }
      delete subscriptions[msg.sender][_planId];
      emit SubscriptionCancelled(msg.sender, _planId, block.timestamp, subscription.cicles);
    }

    function pay(address _subscriber, uint _planId) external nonReentrant() {
      Subscription storage subscription = subscriptions[_subscriber][_planId];
      Plan storage plan = plans[_planId];
      require(subscription.subscriber != address(0), "subscription doesnt exists");
      require(block.timestamp > subscription.nextPayment, "not due yet");

      uint numberPayments = (block.timestamp - subscription.nextPayment) / plan.frequency;
      if(numberPayments > subscription.cicles){
        payable(plan.merchant).transfer(subscription.cicles*plan.amount);
        emit PaymentSent(_subscriber, plan.merchant, plan.amount, _planId, block.timestamp, numberPayments);
        delete subscriptions[_subscriber][_planId];
        emit SubscriptionCancelled(_subscriber, _planId, block.timestamp, 0);
      }else{
        payable(plan.merchant).transfer(numberPayments*plan.amount);
        emit PaymentSent(_subscriber, plan.merchant, plan.amount, _planId, block.timestamp, numberPayments);
        subscription.cicles -= numberPayments;
        subscription.nextPayment = subscription.nextPayment + (plan.frequency*numberPayments);
      }
      
    }
}
