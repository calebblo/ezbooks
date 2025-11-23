import boto3
from typing import Optional, Dict, Any
from boto3.dynamodb.conditions import Key, Attr
import os

from app.core import config

AWS_REGION = config.AWS_REGION

# Table names (can be overridden by env vars if needed, defaulting to user specs)
VENDORS_TABLE_NAME = config.DDB_TABLE_VENDORS
CARDS_TABLE_NAME = config.DDB_TABLE_CARDS

# Initialize DynamoDB resource
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)



def match_vendor(vendor_text: str) -> Optional[Dict[str, Any]]:
    """
    Matches a parsed vendor text against the Vendors table in DynamoDB.
    Uses lowercase normalization, contains, and startsWith logic to find the best match.
    
    Args:
        vendor_text: The vendor name string parsed from the receipt.
        
    Returns:
        A dictionary containing vendor details if a match is found, otherwise None.
        Example: {"vendorId": "v-123", "name": "ABC Landscape Supply"}
    """
    if not vendor_text:
        return None

    table = dynamodb.Table(VENDORS_TABLE_NAME)
    normalized_text = vendor_text.lower().strip()
    
    # Scan the table - Note: Scan is expensive for large tables, but for this helper 
    # and typical vendor lists it might be acceptable as per requirements. 
    # A more optimized approach would be to use a GSI or search index if available.
    # Given the prompt "Query DynamoDB Vendors table" and "Use: contains, startsWith",
    # a Scan with client-side filtering or FilterExpression is implied unless we have a specific index.
    # We'll fetch all and filter in python for "best match" logic which is often complex to do purely in DDB expressions.
    
    try:
        response = table.scan()
        items = response.get('Items', [])
        
        # Handle pagination if necessary (though for a simple helper we might start with one page)
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
            
        best_match = None
        # Simple scoring mechanism:
        # 3 points: Exact match (normalized)
        # 2 points: Starts with
        # 1 point: Contains
        best_score = 0
        
        for item in items:
            db_name = item.get('name', '').lower()
            
            score = 0
            if db_name == normalized_text:
                score = 3
            elif db_name.startswith(normalized_text) or normalized_text.startswith(db_name):
                # "startsWith" logic - checking both directions can be helpful, 
                # but prompt implies "Take your parsed vendorText... Use startsWith"
                # usually means if DB entry starts with parsed text or vice versa.
                # Let's stick to the prompt's likely intent: 
                # Does the DB name start with the parsed text? Or does parsed text start with DB name?
                # Usually we want to match "Home Depot" (DB) with "Home Depot #123" (Parsed).
                # So if Parsed starts with DB name.
                if normalized_text.startswith(db_name): 
                     score = 2
                # Or if DB name starts with Parsed (e.g. Parsed "Home" matches DB "Home Depot") - less likely to be unique but possible.
                elif db_name.startswith(normalized_text):
                     score = 2
            elif normalized_text in db_name or db_name in normalized_text:
                score = 1
            
            if score > best_score:
                best_score = score
                best_match = item
        
        if best_match:
            return {
                "vendorId": best_match.get('vendorId'),
                "name": best_match.get('name')
            }
            
    except Exception as e:
        print(f"Error matching vendor: {e}")
        return None

    return None

def match_card(card_last4: str) -> Optional[Dict[str, Any]]:
    """
    Matches a parsed card last 4 digits against the Cards table in DynamoDB.
    
    Args:
        card_last4: The last 4 digits of the card.
        
    Returns:
        A dictionary containing card details if a match is found, otherwise None.
    """
    if not card_last4:
        return None
        
    table = dynamodb.Table(CARDS_TABLE_NAME)
    
    try:
        # Assuming 'last4' is a Global Secondary Index (GSI) or the Primary Key.
        # If it's not a PK, we need to Scan or Query on GSI.
        # The prompt says: "SELECT * FROM Cards WHERE last4 = :last4"
        # This implies a query if indexed, or scan with filter. 
        # Let's try a Scan with FilterExpression for safety if we don't know the schema,
        # OR if we assume it's an index, we can use Query.
        # Given "Query DynamoDB Cards table", let's try to find it.
        # Since we don't know if 'last4' is a key, a Scan with FilterExpression is the safest generic implementation
        # that mimics "SELECT * WHERE ...".
        
        response = table.scan(
            FilterExpression=Attr('last4').eq(card_last4)
        )
        
        items = response.get('Items', [])
        
        if items:
            # Return the first match
            return items[0]
            
    except Exception as e:
        print(f"Error matching card: {e}")
        return None

    return None
