from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
api_key_path = "prusandbx-nprd-uat-kw1ozq-dcfe6900463a.json"
credentials = Credentials.from_service_account_file(api_key_path,
            scopes=["https://www.googleapis.com/auth/cloud-platform"])

PROJECT_ID = "prusandbx-nprd-uat-kw1ozq"
REGION = "asia-southeast1"

import vertexai

vertexai.init(project=PROJECT_ID, location=REGION, credentials=credentials)

from vertexai.generative_models import GenerativeModel, GenerationConfig

# Use Gemini-2.5-flash
model = GenerativeModel("gemini-2.5-flash")
# res = model.generate_content("What is the capital of VietNam?")
# print(res.text)

generation_config = GenerationConfig(
    max_output_tokens=8192,
    temperature=0.7,
    top_p=0.9,
    top_k=32,

)

# res = model.generate_content("Write about Ngo Dinh Diem?, answer in Vietnamese",
#                               stream=True, generation_config= generation_config)
# for r in res:
#     print(r.text, end="", flush=True)

chat = model.start_chat()
res = chat.send_message("what is 2! + 5!?", generation_config= generation_config, stream=True)
