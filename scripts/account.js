const AccountFrame = Frames.querySelector(`[href="Account"]`);
const NameInput = AccountFrame.querySelector(".NameInput");
const PassInput = AccountFrame.querySelector(".PasswordInput");
const Button = AccountFrame.querySelector(".SignInButton");

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
    new FireStorage("Users").GetDocumentsByField("Name", Name).then(async Users => {
        if (!Users[0]) {
            Account = {
                Name: Name,
                Password: Pass,
                Tag: Math.floor(Math.random() * 10000).toString().padStart(4, "0"),
                ProfileImage: ""
            }
            Button.innerHTML = "Creating a New Account";
            await new FireStorage("Users").AppendDocument(Account).then(Id => Account.id = Id);
            localStorage.setItem("TesseractAccount", JSON.stringify(Account));
            location.reload();
        }
        Account = Users[0];
        if (Account.Password == Pass) {
            Button.innerHTML = "Signing In";
            localStorage.setItem("TesseractAccount", JSON.stringify(Account));
            location.reload();
        } else {
            Tip.setAttribute("style", "");
            Tip.innerHTML = "The password or the username you entered is incorrect";
            setTimeout(() => {
                Tip.style.opacity = "0";
                setTimeout(() => Tip.style.display = "none", 250);
            }, 1000);
        }
    });
});

SignOut.addEventListener("click", () => {
    localStorage.removeItem("TesseractAccount");
    location.reload();
});