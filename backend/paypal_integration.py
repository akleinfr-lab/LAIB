import paypalrestsdk
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# Configure PayPal
paypalrestsdk.configure({
    "mode": os.getenv("PAYPAL_MODE", "sandbox"),
    "client_id": os.getenv("PAYPAL_CLIENT_ID"),
    "client_secret": os.getenv("PAYPAL_CLIENT_SECRET")
})

def create_subscription_plan():
    """Create a billing plan for 0.01€ monthly subscription"""
    plan = paypalrestsdk.BillingPlan({
        "name": "LAIB Premium - 0.01€/month",
        "description": "Unlimited messages with LAIB AI",
        "type": "REGULAR",
        "payment_definitions": [
            {
                "name": "Regular Payment Definition",
                "type": "REGULAR",
                "frequency": "MONTH",
                "frequency_interval": "1",
                "amount": {
                    "value": "0.01",
                    "currency": "EUR"
                },
                "cycles": "0",  # Infinite
                "charge_models": []
            }
        ],
        "merchant_preferences": {
            "setup_fee": {
                "value": "0",
                "currency": "EUR"
            },
            "return_url": os.getenv("PAYPAL_RETURN_URL", "http://localhost:5173/subscription-success"),
            "cancel_url": os.getenv("PAYPAL_CANCEL_URL", "http://localhost:5173/subscription-cancel"),
            "notify_url": os.getenv("PAYPAL_NOTIFY_URL", "http://localhost:8000/paypal-webhook"),
            "max_fail_attempts": "3",
            "initial_fail_amount_action": "CANCEL"
        }
    })
    
    if plan.create():
        return plan.id
    else:
        return None

def create_agreement(plan_id: str, start_date: str, agreement_name: str):
    """Create a billing agreement for user subscription"""
    agreement = paypalrestsdk.BillingAgreement({
        "name": agreement_name,
        "description": "LAIB Premium Subscription",
        "start_date": start_date,
        "agreement_details": {
            "outstanding_balance": "0.00",
            "cycles_remaining": "0",
            "cycles_completed": "0",
            "next_billing_date": start_date
        },
        "payer": {
            "payment_method": "paypal"
        },
        "plan": {
            "id": plan_id
        }
    })
    
    if agreement.create():
        return agreement.id
    else:
        return None

def get_subscription_status(subscription_id: str):
    """Get status of a subscription"""
    try:
        agreement = paypalrestsdk.BillingAgreement.find(subscription_id)
        if agreement.state == "Active":
            return "active"
        elif agreement.state == "Suspended":
            return "suspended"
        elif agreement.state == "Cancelled":
            return "cancelled"
        else:
            return "unknown"
    except:
        return "error"

def cancel_subscription(subscription_id: str):
    """Cancel a subscription"""
    try:
        agreement = paypalrestsdk.BillingAgreement.find(subscription_id)
        if agreement.cancel({"notify": True}):
            return True
        return False
    except:
        return False
