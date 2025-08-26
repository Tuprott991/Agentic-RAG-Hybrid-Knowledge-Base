from typing import Dict, List, Union
import os
from google.cloud import aiplatform
from google.auth import default
from google.auth.exceptions import DefaultCredentialsError
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value

def predict_gemma(
    project: str,
    endpoint_id: str,
    instances: Union[Dict, List[Dict]],
    location: str = "asia-southeast1",
    credentials_path: str = None,
):
    """
    Call a deployed Gemma model on Vertex AI.
    
    Args:
        project: Google Cloud project ID
        endpoint_id: Vertex AI endpoint ID
        instances: Input instances for prediction
        location: Google Cloud region
        credentials_path: Optional path to service account JSON file
    """
    try:
        # Try to authenticate
        if credentials_path and os.path.exists(credentials_path):
            # Use service account key file
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
            print(f"Using credentials from: {credentials_path}")
        
        # Initialize the client
        client_options = {"api_endpoint": f"{location}-aiplatform.googleapis.com"}
        client = aiplatform.gapic.PredictionServiceClient(client_options=client_options)
        
        # Format the endpoint path
        endpoint = client.endpoint_path(
            project=project, location=location, endpoint=endpoint_id
        )

        # If single dict, wrap into list
        if isinstance(instances, dict):
            instances = [instances]

        # Convert each instance into protobuf Value
        proto_instances = [json_format.ParseDict(inst, Value()) for inst in instances]

        # Make prediction
        response = client.predict(
            endpoint=endpoint,
            instances=proto_instances,
            parameters=json_format.ParseDict({}, Value()),
        )

        return response.predictions
        
    except DefaultCredentialsError as e:
        print("❌ Authentication Error!")
        print("Your Google Cloud credentials are not set up. Here are the options:")
        print("\n1. Install Google Cloud CLI and run:")
        print("   gcloud auth application-default login")
        print("\n2. Set up a service account key:")
        print("   - Go to Google Cloud Console > IAM & Admin > Service Accounts")
        print("   - Create a service account with Vertex AI permissions")
        print("   - Download the JSON key file")
        print("   - Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        print(f"\nOriginal error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None


# Example usage - with service account key
result = predict_gemma(
    project="951379520420",
    endpoint_id="7741437070798749696",
    location="asia-southeast1",
    instances={"content": "Hello Gemma, write me a haiku about the ocean."},
    credentials_path="path/to/your/service-account-key.json"  # Add your key file path here
)

print(result)
    