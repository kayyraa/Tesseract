import * as Firebase from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import * as Firestore from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-analytics.js";

globalThis.Firestore = Firestore;

globalThis.FirebaseConfig = {
    apiKey: "AIzaSyDSNDLA-UaeHQ-NbEkgH5QW4f6DHDa6IHU",
    authDomain: "tesseract-2584e.firebaseapp.com",
    projectId: "tesseract-2584e",
    storageBucket: "tesseract-2584e.firebasestorage.app",
    messagingSenderId: "195868077233",
    appId: "1:195868077233:web:6a0765dacd8065d4e00690"
};

globalThis.GithubStorageConfig = {
    Token: "",
    StorageOwner: "kayyraa",
    StorageName: "DirectStorage"
};

globalThis.App = Firebase.initializeApp(FirebaseConfig);
globalThis.Analytics = getAnalytics(App);
globalThis.Db = Firestore.getFirestore(App);

globalThis.Sidebar = document.querySelector(".Sidebar");
globalThis.Profile = document.querySelector(".Profile");
globalThis.Frames = document.querySelector(".Frames");

globalThis.ProfilePopup = document.querySelector(".ProfilePopup");

globalThis.MessageContainer = document.querySelector(".MessageContainer");
globalThis.SendButton = document.querySelector(".SendMessageButton");
globalThis.Tip = document.querySelector(".Tip");

globalThis.AttachmentContainer = document.querySelector(".AttachmentContainer");
globalThis.AddAttachmentButton = document.querySelector(".AddAttachmentButton");

globalThis.Chat = document.querySelector(".Chat");

if (!localStorage.getItem("LastConversationTesseract")) localStorage.setItem("LastConversationTesseract", "");

globalThis.GithubStorage = class {
    constructor(Document) { this.File = Document || null; }

    async Upload(Path = "", OnUpload = (Success = new Boolean()) => {}) {
        if (!this.File) throw new Error("No file provided for upload.");
        const FileContent = await this.ReadFileAsBase64(this.File);

        const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;
        const Data = {
            message: "Upload file to repo",
            content: FileContent
        };

        const Response = await fetch(Url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${GithubStorageConfig.Token}`,
                "Accept": "application/vnd.github.v3+json"
            },
            body: JSON.stringify(Data)
        });
        OnUpload(Response.ok);
    }

    async Download(Path) {
        const Url = `https://api.github.com/repos/${GithubStorageConfig.StorageOwner}/${GithubStorageConfig.StorageName}/contents/${Path}`;

        const Response = await fetch(Url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${GithubStorageConfig.Token}`,
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (Response.ok) {
            const Result = await Response.json();
            const FileContent = atob(Result.content); // Decode Base64 content
            const Blob = new Blob([FileContent], { type: "application/octet-stream" });
            return new File([Blob], Path.split("/").pop(), { type: Blob.type });
        } else {
            const ErrorData = await Response.json();
            console.error("Failed to fetch file:", ErrorData);
            throw new Error(ErrorData.message || "File fetch failed");
        }
    }

    async ReadFileAsBase64(File) {
        return new Promise((Resolve, Reject) => {
            const Reader = new FileReader();
            Reader.onload = () => Resolve(Reader.result.split(",")[1]);
            Reader.onerror = Reject;
            Reader.readAsDataURL(File);
        });
    }
}

globalThis.FireStorage = class {
    constructor(Collection = "") {
        this.Collection = Collection;
    }

    async AppendDocument(DocumentData) {
        if (!this.Collection) return;
        const DocRef = await Firestore.addDoc(Firestore.collection(Db, this.Collection), DocumentData);
        return DocRef.id;
    }

    async GetDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        const Snapshot = await Firestore.getDoc(DocRef);
        if (Snapshot.exists()) return { id: Snapshot.id, ...Snapshot.data() };
        return null;
    }

    async UpdateDocument(DocumentId, DocumentData) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        await Firestore.updateDoc(DocRef, DocumentData);
    }

    async DeleteDocument(DocumentId) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        await Firestore.deleteDoc(DocRef);
    }

    async GetDocuments(Query = {}) {
        if (!this.Collection) return;
        const CollectionRef = Firestore.collection(Db, this.Collection);
        let QueryRef = CollectionRef;
        Object.entries(Query).forEach(([Key, Value]) => {
            QueryRef = Firestore.query(QueryRef, Firestore.where(Key, "==", Value));
        });
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetDocumentsByField(FieldName, FieldValue) {
        if (!this.Collection) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Db, this.Collection),
            Firestore.where(FieldName, "==", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    async GetDocumentByFieldIncludes(FieldName, FieldValue) {
        if (!this.Collection) return;
        const QueryRef = Firestore.query(
            Firestore.collection(Db, this.Collection),
            Firestore.where(FieldName, ">=", FieldValue)
        );
        const QuerySnapshot = await Firestore.getDocs(QueryRef);
        return QuerySnapshot.docs.map(Doc => ({ id: Doc.id, ...Doc.data() }));
    }

    OnSnapshot(Callback) {
        if (!this.Collection) return;
        const CollectionRef = Firestore.collection(Db, this.Collection);
        Firestore.onSnapshot(CollectionRef, Snapshot => {
            Callback(Snapshot);
        });
    }

    OnDocumentSnapshot(DocumentId, Callback) {
        if (!this.Collection) return;
        const DocRef = Firestore.doc(Db, this.Collection, DocumentId);
        return Firestore.onSnapshot(DocRef, Snapshot => {
            if (!Snapshot.exists()) return;
            Callback({ id: Snapshot.id, ...Snapshot.data() });
        });
    }
};

globalThis.UserStorage = new FireStorage("Users");

globalThis.FormatTimestamp = (Timestamp) => {
    let DateObj = new Date(Timestamp * 1000);
    let Now = new Date();

    let Hours = DateObj.getHours();
    let Minutes = DateObj.getMinutes().toString().padStart(2, "0");
    let AmPm = Hours >= 12 ? "PM" : "AM";
    Hours = Hours % 12;
    if (Hours === 0) Hours = 12;

    let TimeString = Hours + ":" + Minutes + " " + AmPm;

    let NowDay = Now.getDate();
    let NowMonth = Now.getMonth();
    let NowYear = Now.getFullYear();

    let Day = DateObj.getDate();
    let Month = DateObj.getMonth();
    let Year = DateObj.getFullYear();

    if (Day === NowDay && Month === NowMonth && Year === NowYear) return TimeString;
    if (Day === NowDay - 1 && Month === NowMonth && Year === NowYear) return "Yesterday at " + TimeString;

    return Day.toString().padStart(2, "0") + "." + (Month + 1).toString().padStart(2, "0") + "." + Year + " " + TimeString;
};

globalThis.TruncateString = (String = "", Length = String.length, Suffix = "") => String.length > Length ? `${String.slice(0, Length)}${Suffix}` : String;

globalThis.Uuid = (Length = 16) => {
    if ((Length & (Length - 1)) !== 0 || Length < 2) return "";

    return Array.from({ length: Length }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).reduce((Acc, Char, Index) =>
        Acc + (Index && Index % (Length / 2) === 0 ? "-" : "") + Char, ""
    );
};

globalThis.SwitchFrame = (FrameHref = "") => {
    if (!FrameHref || (FrameHref && !Frames.querySelector(`[href="${FrameHref}"]`))) return;
    const Frame = Frames.querySelector(`[href="${FrameHref}"]`);
    Frame.setAttribute("style", "opacity: 1;");
    Array.from(Frames.children).forEach(Other => {
        if (Other == Frame) return;
        Other.setAttribute("style", "opacity: 0;");
        setTimeout(() => Other.setAttribute("style", "display: none; opacity: 0;"), 250);
    });
};

Element.prototype.ClickAndHold = function (CallbackFunction, TimeoutDuration = 500) {
    let IsHeld = false;
    let ActiveHoldTimeout = null;

    const OnHoldStart = (Event) => {
        IsHeld = true;

        ActiveHoldTimeout = setTimeout(() => {
            if (IsHeld) {
                CallbackFunction(Event);
                IsHeld = false;
            }
        }, TimeoutDuration);
    };

    const OnHoldEnd = () => {
        IsHeld = false;
        clearTimeout(ActiveHoldTimeout);
    };

    ["mousedown", "touchstart"].forEach(EventType => {
        this.addEventListener(EventType, OnHoldStart, { passive: false });
    });

    ["mouseup", "mouseleave", "mouseout", "touchend", "touchcancel"].forEach(EventType => {
        this.addEventListener(EventType, OnHoldEnd, { passive: false });
    });

    return this;
};

globalThis.GatherLocalAccount = async () => {
    const AccountRaw = localStorage.getItem("TesseractAccount");
    let Account;
    try { Account = AccountRaw ? JSON.parse(AccountRaw) : { Name: ".#" }; } 
    catch { Account = { Name: ".#" }; }
    await new FireStorage("Users").GetDocumentsByField("Name", Account.Name.split("#")[0]).then(Users => {
        Account = Users[0];
    });
    return Account;
};

globalThis.GithubStorageConfig = new Proxy(globalThis.GithubStorageConfig, {
    async set(Target, Key, Value) {
        if (Key === "Token" && Target.Token !== Value && Value) {
            await GatherLocalAccount().then(Account => {
                if (!Account) SwitchFrame("Account");
                else {
                    document.addEventListener("load", SwitchFrame("App"));
                    Profile.querySelector("img").src = Account.ProfileImage || "../images/NotFound.png"
                    Profile.querySelector(".Name").innerHTML = `${Account.Name}#${Account.Tag}`
                }
            });
        }
        Target[Key] = Value;
        return true;
    }
});

document.querySelector(".SignInButton").addEventListener("click", async () => {
    const Name = document.querySelector(".NameInput").value;
    const Password = document.querySelector(".PasswordInput").value;

    const Accounts = await new FireStorage("Users").GetDocumentsByField("Name", Name);
    const Account = Accounts[0];

    if (!Account) {
        const NewAccount = {
            Name: Name,
            Password: Password,
            ProfileImage: "",
            Tag: Math.floor(Math.random() * 10000).toString().padStart(4, "0")
        };
        await new FireStorage("Users").AppendDocument(NewAccount);
        localStorage.setItem("TesseractAccount", JSON.stringify(NewAccount));
        location.reload();
        return;
    }

    if (Account.Password !== Password) {
        Tip.style.display = "";
        setTimeout(() => Tip.style.opacity = 1, 250);
        Tip.innerHTML = "The name or password you entered is incorrect";
        setTimeout(() => {
            Tip.style.opacity = 0;
            setTimeout(() => Tip.style.display = "none", 250);
        }, 3250);
        return;
    }

    localStorage.setItem("TesseractAccount", JSON.stringify(Account));
    location.reload();
});

queueMicrotask(async () => GithubStorageConfig.Token = await new FireStorage("Secrets").GetDocument("Token").then((Document) => Document.Value));