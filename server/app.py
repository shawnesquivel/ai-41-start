from chalice import Chalice, CORSConfig, Response
from chalicelib.utils import current_epoch_time
from chalicelib.mimir_chat import chat_function_call, determine_assistant_tool_messages
app = Chalice(app_name="kitsune-backend")

cors_config = CORSConfig(
    # allow_origin="http://localhost:3000",
    # wildcard: testing only
    allow_origin="*",
    allow_headers=['Content-Type', 'X-Special-Header', 'Authorization'], 
    max_age=600,
    allow_credentials=True,
)


@app.route("/", cors=cors_config)
def index():
    """
    Verify the server status by going to http://127.0.0.1:8000/

    Documentation: https://aws.github.io/chalice/quickstart.html
    """
    return {"Welcome": "to the future!"}


@app.route("/hello/{name}")
def hello_name(name):
    """
    Receives the value after the /hello/{VALUE} does something to it.

    Examples
    --------
    http://127.0.0.1:8000/hello/elon

    http://127.0.0.1:8000/hello/sam
    """
    # '/hello/james' -> {"hello": "james"}

    return {"message": f"Welcome to the course, {name.upper()}!"}


@app.route("/chat", methods=["POST"], cors=cors_config)
def mimir_1():
    try:
        user_message = app.current_request.json_body["message"]
        user_chat_id = app.current_request.json_body["chat_id"]

        messages = chat_function_call(user_msg=user_message)
        print(f"messages: {messages}")
        bot_message, tool_message = determine_assistant_tool_messages(messages)
        print(f"bot message: {bot_message}")
        print(f"bot message: {tool_message}")
        response_object = {
            "chat_id": str(user_chat_id),  
            "timestamp": current_epoch_time(),  
            "content": bot_message,  # message from openai
            "role": "assistant",  # differentiate messages
            "source_documents": tool_message, # function call results
            "audio_file_url": None,   
        }
        return Response(body=response_object, status_code=200)
    except Exception as e:
        print(f'there was an error {e}')
        return Response(body={"error": str(e)}, status_code=500)