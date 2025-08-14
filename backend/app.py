from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import os
import uuid
from botocore.config import Config
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# AWS Configuration
aws_config = Config(
    region_name='ap-southeast-1',
    retries={
        'max_attempts': 3,
        'mode': 'standard'
    }
)

s3_client = boto3.client(
    's3',
    region_name='ap-southeast-1',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    
    try:
        # Initialize Bedrock client with explicit credentials
        client = boto3.client(
            'bedrock-agent-runtime',
            region_name='ap-southeast-1',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            config=aws_config
        )
        
        # Generate new session ID if refresh flag is set
        session_id = data.get('session_id', f"session-{str(uuid.uuid4())}")
        if data.get('refresh'):
            session_id = f"session-{str(uuid.uuid4())}"
        
        response = client.invoke_agent(
            agentId='PNVNE8FSNP',
            agentAliasId='TSTALIASID',
            sessionId=session_id,
            inputText=data['message']
        )
        
        result = ""
        for event in response.get('completion'):
            if 'chunk' in event:
                result += event['chunk']['bytes'].decode('utf-8')
        
        return jsonify({
            "response": result,
            "session_id": session_id
        })
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

@app.route('/end-session', methods=['POST'])
def end_session():
    data = request.json
    try:
        s3_client.put_object(
            Bucket='bias-detection-agent',  # ← Replace with your bucket name
            Key=f"completed_sessions/{data['session_id']}.json",
            Body=json.dumps({
                "session_id": data['session_id'],
                "ended_at": datetime.utcnow().isoformat(),
                "conversation": data['full_conversation']
            }),
            ContentType='application/json',
            ServerSideEncryption='AES256'
        )
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)