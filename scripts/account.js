const AccountFrame = Frames.querySelector(`[href="Account"]`);
const NameInput = AccountFrame.querySelector(".Name");
const PassInput = AccountFrame.querySelector(".Password");
const Button = AccountFrame.querySelector("button");

const SignOut = document.querySelector(".SignOut");

Button.addEventListener("click", async () => {
    Button.innerHTML = "Loading";
    const Name = NameInput.value;
    const Pass = PassInput.value;
    if (!Name || !Pass) {
        Button.innerHTML = "Sign In";
        return;
    }

    let Account;
    new FireStorage("Users").GetDocumentByFieldIncludes("Name", Name).then(async Users => {
        if (!Users[0]) {
            Account = {
                Name: Name,
                Password: Pass,
                Tag: Math.floor(Math.random() * 10000).toString().padStart(4, "0"),
                ProfileImage: ""
            }
            await new FireStorage("Users").AppendDocument(Account).then(Id => Account.id = Id);
            localStorage.setItem("TesseractAccount", JSON.stringify(Account));
            location.reload();
        }
        Account = Users[0];
        if (Account.Password == Pass) {
            localStorage.setItem("TesseractAccount", JSON.stringify(Account));
            location.reload();
        }
    });
});

SignOut.addEventListener("click", () => {
    localStorage.removeItem("TesseractAccount");
    location.reload();
});