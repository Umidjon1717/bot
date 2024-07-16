import { Bot, session, Keyboard } from "grammy";
import { config } from "dotenv";
import mongoose from "mongoose";
config();

const bot = new Bot(process.env.TOKEN);

await bot.api.setMyCommands([
    { command: "start", description: "Start the bot" }

]);

const MainKeyboard = new Keyboard().text("Login").resized().text("Register").resized();

// Mongo
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

const userSchema=new mongoose.Schema({
    name:String,
    email:{
        type: String,
        unique: true
    },
    password:String
})
const User=mongoose.model('User',userSchema)


function initial() {
    return { step: 0, userData: {} };
}

bot.use(session({ initial }));

bot.command("start", async (ctx) => {
    await ctx.react("🎉");
    await ctx.reply("Main Keyboard", {
        reply_markup: MainKeyboard
    });
});
// Register
bot.hears("Register", async (ctx) => {
    ctx.session.step = 1; 
    ctx.session.isLogin=false;
    await ctx.react("⚡")
    await ctx.reply("Enter Your Name");
});

// Login
bot.hears("Login", async (ctx) => {
    ctx.session.step = 1; 
    ctx.session.isLogin=true;
    await ctx.react("⚡")
    await ctx.reply("Enter The Email");
});

bot.on("message", async (ctx) => {
    const step = ctx.session.step;
    const text = ctx.message.text;
    const isLogin=ctx.session.isLogin

    if(isLogin){
        //Login
        if(step===1){
            ctx.session.userData.email=text;
            ctx.session.step=2
            await ctx.react("⚡")
            await ctx.reply("Enter The Password")
        }else if(step===2){
            const email=ctx.session.userData.email;
            const password=text;
            try {
                const user=await User.findOne({email:email});
                if(!user){
                    await ctx.react("🤷‍♂")
                    await ctx.reply("Invalid email or password. Please try again.")
                    ctx.session.step=1;
                    return;
                }if(user.password!==password){
                    await ctx.react("🤷‍♂")
                    await ctx.reply("Invalid email or password. Please try again")
                    ctx.session.step=1;
                    return
                }
                await ctx.react("⚡")
                await ctx.reply(`Welcome back, ${user.name}. You have logged in successfully`)
                ctx.session.step=0;
                ctx.session.userData={}
            } catch (error) {
                console.log("Error during logging in", error);
                await ctx.react("🤷‍♂")
                await ctx.reply("There was an error logging in. Please try again")
                ctx.session.step=0;
                ctx.session.userData={}
            }
        }
    }else{
        //Register
        if (step === 1) {
            ctx.session.userData.name = text;
            ctx.session.step = 2;
            await ctx.react("⚡")
            await ctx.reply("Enter Your Email");
        } else if (step === 2) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(text)) {
                await ctx.react("🤷‍♂")
                await ctx.reply("Invalid email format. Please enter a valid email.");
                return;
            } 
            ctx.session.userData.email = text;
            ctx.session.step = 3;
            await ctx.reply("Enter a Strong Password (6-20 characters)");
        } else if (step === 3) {
            if (text.length < 6 || text.length > 20) {
                await ctx.react("🤷‍♂")
                await ctx.reply("Password must be between 6 and 20 characters. Please enter a valid password.");
                return;
            }
            ctx.session.userData.password = text;
            // save to Mongo
            const newUser=new User(ctx.session.userData);
            await newUser.save()
            console.log(`User saved: ${JSON.stringify(ctx.session.userData)}`);
            ctx.session.step = 0;
            await ctx.react("⚡")
            await ctx.reply(`Thank you for registering, ${ctx.session.userData.name}! Your email is ${ctx.session.userData.email}.`);
            ctx.session.userData = {};
        } else {
            await ctx.reply(" ");
        }

    }

});



bot.start();
