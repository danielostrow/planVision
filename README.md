Current learning models have implicit bias based on what data they are trained on. The purpose of this tool is to train a model specifically on data of our choosing, which is beneficial to small scale projects that are built for specific processes and understandings.

The word *bark* can be interpreted multiple ways in the english language. *Bark*, *barking*, *to bark*... are all things a dog does while *bark* is also the outer layer of a tree. We understand the meaning of the word bark soley on the context of if it is a verb, or a noun. Similar to language recognition we have similar multi-meanings when it comes to identifying objects. When we look at a tomato, we can assume it's a tomato, however, there is a possibility that it is actually a red ball.

planVision is made specifically to define the bias in the learning process specifically to the application that we are building learning models for. Enabling a library of understanding that is incredibly specific, and fine-tuned to the requirements of the model we need has the benefit of being able to focus on the context we need the model to focus on.

------
### How it works

![Annotations](<media/Screenshot 2024-04-24 at 3.09.52 PM.png>)

```JSON
[
    {
        "category": "double_door",
        "dateTime": "2024-04-25T00:35:03.227Z",
        "filePath": "static/data/blobs/double_door_20240425003503_1732a3.png",
        "fromImage": "/static/converted/convertedFile_3.jpg"
    },
    {
        "category": "door",
        "dateTime": "2024-04-25T00:35:03.227Z",
        "filePath": "static/data/blobs/door_20240425003503_3a2de8.png",
        "fromImage": "/static/converted/convertedFile_3.jpg"
    }
]


```
| Category      | Blob |
| ----------- | ----------- |
| Door      |    ![doorBlob](<media/blobdoor.png>)   |
| Double_Door   | ![DoubleDoorBlob](<media/blobdouble.png>)          |