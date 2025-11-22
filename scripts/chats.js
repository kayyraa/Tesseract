const ConversationTemplate = document.querySelector(".ConversationTemplate");
const Local = await GatherLocalAccount();
const Mobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
const ConversationsData = await new FireStorage("Conversations").GetDocuments();
const LastConversationId = localStorage.getItem("LastConversationTesseract");
let LastConversationClone = null;
const Snapshots = {};
const MobileRemoveSet = new WeakSet();
const MobileConversationRemoveSet = new WeakSet();

const Popup = (Rect, Image = "", Username = "") => {
    ProfilePopup.setAttribute("style",`
        left: ${Rect.left + Rect.width + 8}px;
        top: ${Rect.top}px;
    `);
    ProfilePopup.querySelector(".Headers > .ProfileImage").setAttribute("src", Image || "../images/NotFound.png");
    ProfilePopup.querySelector(".Headers > .Username").innerHTML = Username;
};

for (const Conversation of ConversationsData) {
    if (!Conversation.Users.includes(`${Local.Name}#${Local.Tag}`)) continue;

    const ConversationClone = ConversationTemplate.cloneNode(true);
    ConversationClone.setAttribute("style", "");
    Sidebar.appendChild(ConversationClone);

    const IsGroup = Conversation.Users.length > 2;

    if (IsGroup) {
        const LocalFull = `${Local.Name}#${Local.Tag}`;
        const OtherUsers = Conversation.Users.filter(User => User !== LocalFull);

        const OtherNames = OtherUsers.map(User => User.split("#")[0]).join(", ");
        ConversationClone.querySelector("span").innerHTML = OtherNames;
        ConversationClone.setAttribute("org", OtherNames);
        ConversationClone.setAttribute("dis", OtherNames);

        const FirstOtherName = OtherUsers[0].split("#")[0];
        const SecondOtherName = OtherUsers[1].split("#")[0];
        const FirstOtherAccount = await UserStorage.GetDocumentsByField("Name", FirstOtherName);
        const SecondOtherAccount = await UserStorage.GetDocumentsByField("Name", SecondOtherName);
        ConversationClone.querySelector("img").src = FirstOtherAccount[0].ProfileImage || "../images/NotFound.png";
        ConversationClone.innerHTML += `<img src="${SecondOtherAccount[0].ProfileImage || "../images/NotFound.png"}">`;
        ConversationClone.setAttribute("group", "true");
    } else {
        const OtherUsername = Conversation.Users.filter(User => User !== `${Local.Name}#${Local.Tag}`)[0];
        const OtherAccount = await UserStorage.GetDocumentsByField("Name", OtherUsername.split("#")[0]);
        ConversationClone.querySelector("span").innerHTML = OtherUsername.split("#")[0];
        ConversationClone.setAttribute("org", OtherUsername);
        ConversationClone.setAttribute("dis", OtherUsername.split("#")[0]);
        ConversationClone.querySelector("img").src = OtherAccount[0].ProfileImage || "../images/NotFound.png";
    }

    if (LastConversationId === Conversation.id) LastConversationClone = ConversationClone;

    ConversationClone.addEventListener("mouseenter", () => ConversationClone.querySelector("span").innerHTML = ConversationClone.getAttribute("org"));
    ConversationClone.addEventListener("mouseleave", () => ConversationClone.querySelector("span").innerHTML = ConversationClone.getAttribute("dis"));

    ConversationClone.addEventListener("mousedown", (_) => ConversationClone.style.backgroundColor = _.button === 2 ? "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)" : "");
    ConversationClone.addEventListener("mouseleave", () => ConversationClone.style.backgroundColor = "");
    ConversationClone.addEventListener("mouseup", () => ConversationClone.style.backgroundColor = "");

    const RemoveConversation = async (DocumentId) => {
        await new FireStorage("Conversations").DeleteDocument(DocumentId);
        ConversationClone.remove();
        Tip.style.opacity = 0;
        setTimeout(() => Tip.style.display = "none", 250);
    };

    ConversationClone.ClickAndHold((Meta) => {
        if (Meta && Meta.button !== 2 && !Mobile) return;
        ConversationClone.style.backgroundColor = "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)";
        Tip.style.display = "";
        setTimeout(() => Tip.style.opacity = 1, 250);
        Tip.innerHTML = Mobile
            ? "Click and hold on the conversation again to remove it. [2s]"
            : "Right click on the conversation to remove it. [2s]";

        let Timer;
        let ClickListener;

        const Cleanup = () => {
            clearTimeout(Timer);
            ConversationClone.style.backgroundColor = "";
            if (ClickListener) document.removeEventListener("mousedown", ClickListener);
            Tip.style.opacity = 0;
            setTimeout(() => Tip.style.display = "none", 250);
        };

        Timer = setTimeout(() => Cleanup(), 2250);

        if (Mobile) {
            if (!MobileConversationRemoveSet.has(ConversationClone)) {
                MobileConversationRemoveSet.add(ConversationClone);
                ConversationClone.ClickAndHold(async () => {
                    clearTimeout(Timer);
                    await RemoveConversation(Conversation.id);
                    Cleanup();
                });
            }
            return;
        }

        ClickListener = async (Event) => {
            if (Event.button !== 2) return;
            clearTimeout(Timer);
            await RemoveConversation(Conversation.id);
            Cleanup();
            document.removeEventListener("mousedown", ClickListener);
        };

        document.addEventListener("mousedown", ClickListener);
    });

    ConversationClone.addEventListener("click", async (_) => {
        const OtherUsername = Conversation.Users.filter(User => User !== `${Local.Name}#${Local.Tag}`)[0];
        localStorage.setItem("LastConversationTesseract", Conversation.id);

        const Update = async () => {
            const MessageContainer = Chat.querySelector(".MessageContainer");
            if (MessageContainer) Array.from(MessageContainer.children).forEach(Node => Node.remove());
            const ConvContainer = Chat.querySelector(".ConversationContainer");
            if (ConvContainer) ConvContainer.remove();

            const Doc = await new FireStorage("Conversations").GetDocument(Conversation.id);
            let LastAuthor = "";

            for (let Index = 0; Index < Doc.Messages.length; Index++) {
                const Message = Doc.Messages[Index];
                const Author = Message.Author.split("#")[0];
                const AuthorDocument = await UserStorage.GetDocumentsByField("Name", Author);

                const MessageInstance = document.createElement("div");
                MessageInstance.setAttribute("class", "Message");

                const TempDiv = document.createElement("div");
                TempDiv.innerHTML = Message.Content;

                const AttachmentContainer = document.createElement("div");
                AttachmentContainer.setAttribute("class", "AttachmentContainer");

                const ImageNodes = Array.from(TempDiv.querySelectorAll("img"));
                ImageNodes.forEach(Image => {
                    const Clone = Image.cloneNode(true);
                    Clone.addEventListener("click", () => open(Clone.getAttribute("src")));
                    AttachmentContainer.appendChild(Clone);
                    Image.remove();
                });

                const TextContent = TempDiv.innerHTML;

                MessageInstance.innerHTML = `
                    <img class="ProfileImage" src="${AuthorDocument[0].ProfileImage || "../images/NotFound.png"}">
                    <div class="Headers">
                        <span class="Username">${Author}</span>
                        <span class="Timestamp">${FormatTimestamp(Message.Timestamp)}</span>
                    </div>
                    <div class="Content">${TextContent}</div>
                `.replaceAll("\n", "");

                MessageInstance.querySelector(".Content").appendChild(AttachmentContainer);

                if (Local.Name === Message.Author) {
                    MessageInstance.addEventListener("mousedown", (_) => MessageInstance.style.borderColor = _.button === 2 ? "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)" : "");
                    MessageInstance.addEventListener("mouseup", () => MessageInstance.style.borderColor = "");

                    MessageInstance.ClickAndHold((_) => {
                        if (_.button !== 2) return;
                        Tip.style.display = "";
                        setTimeout(() => Tip.style.opacity = 1, 250);
                        Tip.innerHTML = Mobile
                            ? "Click and hold on the message again to remove your message. [2s]"
                            : "Right click on the message to remove your message. [2s]";
                        MessageInstance.style.borderColor = "color-mix(in srgb, var(--TextColorTertiary), rgb(255, 89, 89) 50%)";

                        let Timer;
                        let RightClickListener;

                        const Cleanup = () => {
                            clearTimeout(Timer);
                            if (RightClickListener) document.removeEventListener("mousedown", RightClickListener);
                            MessageInstance.style.borderColor = "";
                            Tip.style.opacity = 0;
                            setTimeout(() => Tip.style.display = "none", 250);
                        };

                        Timer = setTimeout(() => Cleanup(), 2250);

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
                            Cleanup();
                        };

                        if (Mobile) {
                            if (!MobileRemoveSet.has(MessageInstance)) {
                                MobileRemoveSet.add(MessageInstance);
                                MessageInstance.ClickAndHold(async () => {
                                    clearTimeout(Timer);
                                    await RemoveMessage();
                                });
                            }
                            return;
                        }

                        RightClickListener = async (Event) => {
                            if (Event.button !== 2) return;
                            clearTimeout(Timer);
                            await RemoveMessage();
                            document.removeEventListener("mousedown", RightClickListener);
                        };

                        document.addEventListener("mousedown", RightClickListener);
                    });
                }

                const UsernameLabel = MessageInstance.querySelector(".Username");
                const ProfileImageLabel = MessageInstance.querySelector(".ProfileImage");
                UsernameLabel.addEventListener("click", () => Popup(UsernameLabel.getBoundingClientRect(), AuthorDocument[0].ProfileImage, `${AuthorDocument[0].Name}<span class="Tag">#${AuthorDocument[0].Tag}</span>`));
                ProfileImageLabel.addEventListener("click", () => Popup(ProfileImageLabel.getBoundingClientRect(), AuthorDocument[0].ProfileImage, `${AuthorDocument[0].Name}<span class="Tag">#${AuthorDocument[0].Tag}</span>`));

                ProfilePopup.addEventListener("crisp", (_) => console.log(_));

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
                const MessageContainer = Chat.querySelector(".MessageContainer");
                if (MessageContainer) MessageContainer.appendChild(MessageInstance);
            }

            Chat.scroll(0, Chat.scrollHeight);
            Chat.querySelector(".MessageInput").setAttribute("placeholder", `Message @${OtherUsername.split("#")[0]}`);

            const SendMessage = async (String = "") => {
                if (!String) return;
                SendButton.style.opacity = 0;
                const NewDoc = await new FireStorage("Conversations").GetDocument(Conversation.id);
                const Messages = NewDoc.Messages;
                Messages.push({
                    Author: Local.Name,
                    Content: String,
                    Timestamp: Math.floor(Date.now() / 1000)
                });
                const AttachmentContainer = Chat.querySelector(".AttachmentContainer");
                if (AttachmentContainer) Array.from(AttachmentContainer.children).forEach(Node => { if (Node.tagName === "IMG") Node.remove(); });
                await new FireStorage("Conversations").UpdateDocument(Conversation.id, { Messages: Messages });
            };

            const MessageInput = Chat.querySelector(".MessageInput");
            MessageInput.onkeydown = async (_) => {
                if (_.key !== "Enter") return;
                SendMessage(MessageInput.value);
                MessageInput.value = "";
            };

            MessageInput.oninput = () => {
                if (SendButton) SendButton.style.opacity = MessageInput.value ? 1 : 0;
            };

            if (SendButton) {
                const SendHandler = () => {
                    SendMessage(MessageInput.value);
                    MessageInput.value = "";
                };
                SendButton.removeEventListener("click", SendHandler);
                SendButton.addEventListener("click", SendHandler);
            }
        };

        if (!Snapshots[Conversation.id]) {
            Snapshots[Conversation.id] = true;
            new FireStorage("Conversations").OnDocumentSnapshot(Conversation.id, async () => await Update());
        } else await Update();
    });
}

if (LastConversationClone) LastConversationClone.click();

const CreateConversation = async () => {
    const Value = document.querySelector(".ConversationInput").value;
    const RawUsers = Value.split(",").map(_ => _.trim()).filter(Boolean);
    const LocalFull = `${Local.Name}#${Local.Tag}`;
    const Users = [];

    for (const RawUser of RawUsers) {
        if (!/^[^#]+#[0-9]{4}$/.test(RawUser)) return;
        const UserDocument = await new FireStorage("Users").GetDocumentsByField("Name", RawUser.split("#")[0]);
        if (!UserDocument[0] || UserDocument[0].Tag !== RawUser.split("#")[1]) return;
        const FullName = `${UserDocument[0].Name}#${UserDocument[0].Tag}`;
        if (FullName === LocalFull) continue;
        Users.push(FullName);
    }

    if (!Users.length) return;

    const Existing = await new FireStorage("Conversations").GetDocuments();
    const Exists = Existing.some(Conversation => {
        if (Conversation.Users.length !== Users.length + 1) return false;
        const AllUsers = [LocalFull, ...Users];
        return AllUsers.every(User => Conversation.Users.includes(User));
    });
    if (Exists) return;

    await new FireStorage("Conversations").AppendDocument({
        Users: [LocalFull, ...Users],
        Messages: []
    });

    location.reload();
};

document.querySelector(".ConversationInput").addEventListener("keydown", async (_) => _.key === "Enter" ? await CreateConversation() : "");
document.querySelector(".CreateButton").addEventListener("click", async () => await CreateConversation());

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
    const AttachmentContainer = Chat.querySelector(".AttachmentContainer");
    if (AttachmentContainer) AttachmentContainer.appendChild(ImageInstance);

    const Path = `Tesseract/${Uuid(8)}.png`;
    const FileUrl = `https://github.com/kayyraa/DirectStorage/blob/main/${Path}?raw=true`;
    await new GithubStorage(PngBlob).Upload(Path, () => ImageInstance.setAttribute("src", FileUrl));
    const MessageInput = Chat.querySelector(".MessageInput");
    if (MessageInput) MessageInput.value += `<img src="${FileUrl}">`;
    ImageInstance.ClickAndHold(() => {
        ImageInstance.remove();
        if (MessageInput) MessageInput.value = MessageInput.value.replace(`<img src="${FileUrl}">`, "");
    }, 250);
});

document.querySelector(".Patch.Home").addEventListener("click", () => {
    localStorage.setItem("LastConversationTesseract", "");

    const MessageContainer = Chat.querySelector(".MessageContainer");
    if (MessageContainer) Array.from(MessageContainer.children).forEach(Node => Node.remove());

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

    let ConvContainer = Chat.querySelector(".ConversationContainer");
    if (!ConvContainer) {
        ConvContainer = document.createElement("div");
        ConvContainer.setAttribute("class", "ConversationContainer");
        Chat.appendChild(ConvContainer);
    }

    ConvContainer.innerHTML = `
        <input class="ConversationInput" type="text" placeholder="Write the Name#Tag to start a conversation">
        <button class="CreateButton">Create</button>
    `;

    const NewCreate = ConvContainer.querySelector(".CreateButton");
    if (NewCreate) {
        NewCreate.addEventListener("click", async () => {
            const Value = ConvContainer.querySelector(".ConversationInput").value;
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
    }

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

document.addEventListener("mousedown", (_) => {
    if (_.target === ProfilePopup || _.target.offsetParent === ProfilePopup || [ "Username", "ProfileImage" ].includes(_.target.getAttribute("class"))) return;
    ProfilePopup.style.opacity = "0";
    setTimeout(() => ProfilePopup.style.display = "none", 250);
});

Tip.addEventListener("click", () => {
    Tip.style.opacity = 0;
    setTimeout(() => Tip.style.display = "none", 250);
});