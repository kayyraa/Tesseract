const ConversationTemplate = document.querySelector(".ConversationTemplate");
const Local = await GatherLocalAccount();

const Mobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const ConversationsData = await new FireStorage("Conversations").GetDocuments();
const LastConversationId = localStorage.getItem("LastConversationTesseract");
let LastConversationClone = null;

const Snapshots = {};

for (const Conversation of ConversationsData) {
    if (!Conversation.Users.includes(`${Local.Name}#${Local.Tag}`)) continue;

    const ConversationClone = ConversationTemplate.cloneNode(true);
    ConversationClone.setAttribute("style", "");
    Sidebar.appendChild(ConversationClone);

    const IsGroup = Conversation.Users.length > 2;

    if (!IsGroup) {
        const OtherUsername = Conversation.Users.filter(User => User !== `${Local.Name}#${Local.Tag}`)[0];
        const OtherAccount = await UserStorage.GetDocumentsByField("Name", OtherUsername.split("#")[0]);
        ConversationClone.querySelector("span").innerHTML = OtherUsername.split("#")[0];
        ConversationClone.querySelector("img").src = OtherAccount[0].ProfileImage || "../images/NotFound.png";
    }

    if (LastConversationId === Conversation.id) LastConversationClone = ConversationClone;
    
    ConversationClone.addEventListener("mousedown", (_) => ConversationClone.style.backgroundColor = _.button === 2 ? "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)" : "");
    ConversationClone.addEventListener("mouseleave", (_) => ConversationClone.style.backgroundColor = _.button === 2 ? "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)" : "");
    ConversationClone.addEventListener("mouseup", () => ConversationClone.style.backgroundColor = "");
    
    const RemoveConversation = async (DocumentId) => {
        await new FireStorage("Conversations").DeleteDocument(DocumentId);
        ConversationClone.remove();
        Tip.style.opacity = 0;
        setTimeout(() => Tip.style.display = "none", 250);
    };

    ConversationClone.ClickAndHold((_) => {
        if (_.button !== 2) return;
        ConversationClone.style.backgroundColor = "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)";

        Tip.style.display = "";
        setTimeout(() => Tip.style.opacity = 1, 250);
        Tip.innerHTML = Mobile
            ? "Click and hold on the conversation again to remove it. [2s]"
            : "Right click on the conversation to remove it. [2s]";

        let Timer = setTimeout(() => {
            Tip.style.opacity = 0;
            setTimeout(() => Tip.style.display = "none", 250);
            ConversationClone.style.backgroundColor = "";
            document.removeEventListener("mousedown", ClickListener);
        }, 2250);

        if (Mobile) {
            ConversationClone.ClickAndHold(async () => {
                clearTimeout(Timer);
                await RemoveConversation(Conversation.id);
            });
            return;
        }

        const ClickListener = async (Event) => {
            clearTimeout(Timer);
            await RemoveConversation(Conversation.id);
            document.removeEventListener("mousedown", ClickListener);
        };

        document.addEventListener("mousedown", ClickListener);
    });

    ConversationClone.addEventListener("mousedown", async (_) => {
        if (_.button !== 0) return;
        const OtherUsername = Conversation.Users.filter(User => User !== `${Local.Name}#${Local.Tag}`)[0];
        localStorage.setItem("LastConversationTesseract", Conversation.id);

        const Update = async () => {
            Array.from(MessageContainer).forEach(Node => Node.remove());

            const Doc = await new FireStorage("Conversations").GetDocument(Conversation.id);
            let LastAuthor = "";

            for (let Index = 0; Index < Doc.Messages.length; Index++) {
                const Message = Doc.Messages[Index];
                const Author = Message.Author.split("#")[0];
                const AuthorDocument = await UserStorage.GetDocumentsByField("Name", Author);

                const MessageInstance = document.createElement("div");
                MessageInstance.setAttribute("class", "Message");
                MessageInstance.innerHTML = `
                    <img class="ProfileImage" src="${AuthorDocument[0].ProfileImage}">
                    <div class="Headers">
                        <span class="Username">${Author}</span>
                        <span class="Timestamp">${FormatTimestamp(Message.Timestamp)}</span>
                    </div>
                    <div class="Content">${Message.Content}</div>
                `.replaceAll("\n", "");

                if (Local.Name === Message.Author) {
                        MessageInstance.addEventListener("mousedown", () => MessageInstance.style.borderColor = "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)");
                        MessageInstance.addEventListener("mouseup", () => MessageInstance.style.borderColor = "");

                        MessageInstance.ClickAndHold(() => {
                            Tip.style.display = "";
                            setTimeout(() => Tip.style.opacity = 1, 250);
                            Tip.innerHTML = Mobile 
                                ? "Click and hold on the message again to remove your message. [2s]" 
                                : "Right click on the message to remove your message. [2s]";

                            let Timer = setTimeout(() => {
                                Tip.style.opacity = 0;
                                setTimeout(() => Tip.style.display = "none", 250);
                                document.removeEventListener("mousedown", RightClickListener);
                            }, 2250);
                        
                            const RemoveMessage = async () => {
                                const NewDoc = await new FireStorage("Conversations").GetDocument(Conversation.id);
                                await new FireStorage("Conversations").UpdateDocument(Conversation.id, {
                                    Messages: NewDoc.Messages.filter((Object) =>
                                        Object.Author !== Message.Author ||
                                        Object.Content !== Message.Content ||
                                        Object.Timestamp !== Message.Timestamp
                                    )
                                });
                                MessageInstance.remove();
                                Tip.style.opacity = 0;
                                setTimeout(() => Tip.style.display = "none", 250);
                                clearTimeout(Timer);
                            };
                        
                            if (Mobile) {
                                MessageInstance.ClickAndHold(async () => await RemoveMessage());
                                return;
                            }
                        
                            const RightClickListener = async (Event) => {
                                if (Event.button !== 2) return;
                                await RemoveMessage();
                                document.removeEventListener("mousedown", RightClickListener);
                            };
                        
                            document.addEventListener("mousedown", RightClickListener);
                        });
                    }

                const CurrentAuthor = Author;
                const Next = Doc.Messages[Index + 1];

                const LastTimestamp = Index > 0 ? Doc.Messages[Index - 1].Timestamp : null;
                const CurrentTimestamp = Message.Timestamp;
                const Within45 = LastTimestamp && (CurrentTimestamp - LastTimestamp) <= 45;

                MessageInstance.style.borderTopLeftRadius = "0";
                MessageInstance.style.borderTopRightRadius = "0";
                MessageInstance.style.borderBottomLeftRadius = "0";
                MessageInstance.style.borderBottomRightRadius = "0";
                MessageInstance.style.marginTop = "0";
                MessageInstance.style.marginBottom = "0";

                if (!Within45 || CurrentAuthor !== LastAuthor) {
                    MessageInstance.style.borderTopLeftRadius = "16px";
                    MessageInstance.style.borderTopRightRadius = "16px";
                    MessageInstance.style.marginTop = "4px";
                }

                const NextTimestamp = Next ? Next.Timestamp : null;
                const NextWithin45 = Next && (NextTimestamp - CurrentTimestamp) <= 45;

                if (!Next || Next.Author.split("#")[0] !== CurrentAuthor || !NextWithin45) {
                    MessageInstance.style.borderBottomLeftRadius = "16px";
                    MessageInstance.style.borderBottomRightRadius = "16px";
                    MessageInstance.style.marginBottom = "4px";
                }

                LastAuthor = CurrentAuthor;
                MessageContainer.appendChild(MessageInstance);
            }

            Chat.scroll(0, Chat.scrollHeight);
            Chat.querySelector(".MessageInput").setAttribute("placeholder", `Message @${OtherUsername.split("#")[0]}`);

            const SendMessage = async (String = "") => {
                if (!String) return;
                const NewDoc = await new FireStorage("Conversations").GetDocument(Conversation.id);
                const Messages = NewDoc.Messages;
                Messages.push({
                    Author: Local.Name,
                    Content: String,
                    Timestamp: Math.floor(Date.now() / 1000)
                });
                Array.from(AttachmentContainer.children).forEach(Node => { if (Node.tagName === "IMG") Node.remove(); });
                await new FireStorage("Conversations").UpdateDocument(Conversation.id, { Messages: Messages });
            };

            const MessageInput = Chat.querySelector(".MessageInput");
            MessageInput.onkeydown = async (_) => {
                if (_.key !== "Enter") return;
                SendMessage(MessageInput.value);
                MessageInput.value = "";
            };

            MessageInput.oninput = () => {
                document.querySelector(".SendMessageButton").style.opacity = MessageInput.value ? 1 : 0;
            };

            document.querySelector(".SendMessageButton").addEventListener("click", () => {
                SendMessage(MessageInput.value);
                MessageInput.value = "";
            });
        };

        if (!Snapshots[Conversation.id]) {
            Snapshots[Conversation.id] = true;
            new FireStorage("Conversations").OnDocumentSnapshot(Conversation.id, async () => await Update());
        } else await Update();
    });
}

if (LastConversationClone) LastConversationClone.click();

document.querySelector(".CreateButton").addEventListener("click", async () => {
    const Value = document.querySelector(".ConversationInput").value;
    if (!/^[^#]+#[0-9]{4}$/.test(Value)) return;
    const UserDocument = await new FireStorage("Users").GetDocumentsByField("Name", Value.split("#")[0]);
    if (UserDocument[0].Tag !== Value.split("#")[1]) return;
    const LocalName = `${Local.Name}#${Local.Tag}`;
    const TargetName = `${UserDocument[0].Name}#${UserDocument[0].Tag}`;
    if (LocalName === TargetName) return;

    const Existing = await new FireStorage("Conversations").GetDocuments();
    const Exists = Existing.some(Conversation => {
        if (Conversation.Users.length !== 2) return false;
        return Conversation.Users.includes(LocalName) && Conversation.Users.includes(TargetName);
    });
    if (Exists) return;

    await new FireStorage("Conversations").AppendDocument({
        Users: [LocalName, TargetName],
        Messages: []
    });

    location.reload();
});

const AttachmentInput = document.createElement("input");
AttachmentInput.setAttribute("type", "file");
AttachmentInput.setAttribute("accept", "image/*");

AddAttachmentButton.addEventListener("click", () => AttachmentInput.click());

AttachmentInput.addEventListener("change", async (_) => {
    const File = AttachmentInput.files[0];
    if (!File) return;

    const ArrayBuffer = await File.arrayBuffer();
    const PngBlob = new Blob([ArrayBuffer], { type: "image/png" });

    const ImageInstance = document.createElement("img");
    ImageInstance.setAttribute("src", "../images/Placeholder.svg");
    AttachmentContainer.appendChild(ImageInstance);

    const Path = `Tesseract/${Uuid(8)}.png`;
    const FileUrl = `https://github.com/kayyraa/DirectStorage/blob/main/${Path}?raw=true`;
    await new GithubStorage(PngBlob).Upload(Path, () => ImageInstance.setAttribute("src", FileUrl));
    Chat.querySelector(".MessageInput").value += `<img src="${FileUrl}">`;
    ImageInstance.ClickAndHold(() => {
        ImageInstance.remove();
        Chat.querySelector(".MessageInput").value = Chat.querySelector(".MessageInput").value.replace(`<img src="${FileUrl}">`, "");
    }, 250);
});

document.querySelector(".Patch.Home").addEventListener("click", () => {
    localStorage.setItem("LastConversationTesseract", "");

    Array.from(MessageContainer.children).forEach(Node => Node.remove());

    const InputContainer = Chat.querySelector(".InputContainer");
    if (InputContainer) {
        const MessageInput = InputContainer.querySelector(".MessageInput");
        if (MessageInput) MessageInput.value = "";
    }

    const AttachmentContainer = Chat.querySelector(".AttachmentContainer");
    if (AttachmentContainer) Array.from(AttachmentContainer.children).forEach(Node => {
        if (Node.tagName === "HEADER") return;
        Node.remove();
    });

    Chat.innerHTML += `
        <div class="ConversationContainer">
            <input class="ConversationInput" type="text" placeholder="Write the Name#Tag to start a conversation">
            <button class="CreateButton">Create</button>
        </div>
    `;

    Tip.style.opacity = 0;
    setTimeout(() => Tip.style.display = "none", 250);
});

const ProfileImageInput = document.createElement("input");
ProfileImageInput.setAttribute("type", "file");
ProfileImageInput.setAttribute("accept", "image/*");

document.querySelector(".LocalProfileImage").addEventListener("click", () => ProfileImageInput.click());

ProfileImageInput.addEventListener("change", async (_) => {
    const File = ProfileImageInput.files[0];
    if (!File) return;

    const ArrayBuffer = await File.arrayBuffer();
    const PngBlob = new Blob([ArrayBuffer], { type: "image/png" });

    const Path = `Tesseract/${Uuid(8)}.png`;
    const FileUrl = `https://github.com/kayyraa/DirectStorage/blob/main/${Path}?raw=true`;
    await new GithubStorage(PngBlob).Upload(Path);
    await new FireStorage("Users").UpdateDocument(Local.id, { ProfileImage: FileUrl });
    location.reload();
});

document.addEventListener("contextmenu", (_) => _.preventDefault(), { passive: false });

Tip.addEventListener("click", () => {
    Tip.style.opacity = 0;
    setTimeout(() => Tip.style.display = "none", 250);
});