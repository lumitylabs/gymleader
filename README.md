[![N|Solid](https://i.imgur.com/VqsfDqK.png)](https://gymleader.lumitylabs.com)  
# GymLeader [![Status: Active](https://img.shields.io/badge/status-active-success.svg)](https://github.com/lumitylabs/gymleader/STATUS.md) [![Version 1.0.0](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/lumitylabs/gymleader/releases/tag/1.0.0)
###### _Pokéthon: The First Pokémon Hackathon for AI Agents - CreatorBid, Collectorcrypt and Beezie, 2025_
### Create your Gym Become a Master | [Try GymLeader Live](https://gymleader.lumitylabs.com/)
"GymLeader transforms how you use your cards. It allows you to build your own custom gym, a place where your physical collection comes to life through AI agents. You manage your team, interact with your Pokémon, and fight unique battles against leaders worldwide, earning exclusive badges that immortalize your victories."

## 📖 Quick Index
- [🔎 Why?](#-why)
- [🎥 Demo](#-demo)
- [🧢 Become a Gym Leader](#-become-a-gym-leader)
- [🚀 Vision & Economy](#vision--economy)
- [🤖 Pokémon Judge Agent](#-pokémon-judge-agent)
- [💡 How does it Work?](#-how-does-it-work)
- [🔧 Technologies](#-technologies)
- [💿 Installation](#-installation)
- [🐞 Report Bug and Errors](#-report-bug-and-errors)
- [📧 Contact](#-contact)

## 🔎 Why?
Collectors face a dilemma: enjoying their cards usually means devaluing them. We built GymLeader to bridge the gap between **Asset Preservation** and **Immersive Utility**.
We solve the main challenges of collecting by transforming them into new experiences:

**✨ Unique Battle Experiences.**  
> Forget rigid buttons like "Attack" or "Thunderbolt". In Gym Leader, you use **Natural Language** to command your team, just like in the anime. The AI understands your strategy, making every battle unique.

**🛡️ Limitless, wear-free interaction.**  
> Your Pokémon cards obtained from **CollectorCrypt** or **Beezie** remain safe. Simply connect your wallet to import your assets instantly. You get the full utility of your Gym without ever risking a scratch on the physical slab.

**🤝 Social Immersion & Market Movement.**  
> Collecting shouldn't be lonely. In GymLeader, every battle is an opportunity to meet **other Leaders** and see their teams in action. It’s a natural way to discover new cards you didn't know, learn strategies, and connect with collectors worldwide.

## 🎥 Demo
[![Video Demo](https://i.imgur.com/d1fHbc9.png)](https://www.youtube.com/watch?v=AwelMLjpMAk)

## 🧢 Become a Gym Leader

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>1. 🧪 Register & Receive</h3>
      <p>Sign in (Gmail) to meet <b>Professor Oak</b> and redeem a free starter, or connect your <b>CollectCrypt</b> or <b>Beezie</b> wallet to import your Pokémons cards directly into the platform.</p>
    </td>
    <td width="50%" valign="top">
      <h3>2. 🏟️ Establish your Gym</h3>
      <p>Every Leader needs a Gym. Access the <b>GYM</b> button to describe your arena's theme, draft your defensive team, and set <b>Strategy</b> to protect your Gym while you are away.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>3. ⚔️ The Victory Road</h3>
      <p>With your Gym secure, go on the offense! Enter <b>Battle</b> button, challenge a rival Gym, and command your Pokémon Team using creative <b>Natural Language</b> tactics.</p>
    </td>
    <td width="50%" valign="top">
      <h3>4. 💎 Collect & Conquer</h3>
      <p>Victory earns you <b>Badges</b> and rewards. Use them to evolve your roster, compete for exclusive prizes, and climb the <b>Global Ranking</b> to become a Master.</p>
    </td>
  </tr>
</table>

## 🚀 Vision & Economy
We are building more than a game; we are creating a new experiences for collectors. Our roadmap focuses on increasing the value of Real World Assets (RWA).

#### 💸 1. The Agent Economy (via CreatorBid)
> Our "Pokémon Judge Agent" was designed to be released on **CreatorBid**. 

#### 📅 2. Project Status
> Want to see what's next? Check our live docs:

| Document | Description |
| :--- | :--- |
| 🗺️ [**Technical Roadmap**](https://github.com/lumitylabs/gymleader/blob/main/STATUS.md) | Future features, breeding mechanics & tokenomics. |


## 🤖 Pokémon Judge Agent
The **Pokémon Judge** is an autonomous AI agent specialized in Pokémon battles. It acts simultaneously as both a narrator and a judge, analyzing all combat variables in real-time to ensure a fair and dynamic experience.

**Key Features:**
- **Dynamic Storytelling:** Describes events based on the battle flow.
- **Contextual Analysis:** Evaluates battlefield conditions (gym terrain) and environmental factors.
- **Strategic Evaluation:** Processes used cards, team synergy, and instructions given to Pokémon.
- **Victory Decision:** Grants victory based on tactical skill and the leader's decision-making.

#### ⚙️ Under the Hood: The Logic Chain
To ensure the battle remains grounded in Pokémon rules, the Agent runs a strict validation chain before narrating for example:

> **System Prompt Validation Protocol:**

> 1.  **Move Legality Check:** `Can {Pokemon} actually learn {Move}?` → *If No: Attack Fails.*
> 2.  **Type Effectiveness:** `Calculating {Move_Type} vs {Def_Type}` → *Result: Super Effective (2x).*
> 3.  **Environmental Modifiers:** `Is {Arena_Condition} active?` → *Result: Rain boosts Water moves.*

**🎯 The Goal:** _To ensure every battle is unique, epic, and won by the most skilled leader, not just the strongest card._

## 💡 How does it Work?  
<p align="left">
  <img src="https://i.imgur.com/6MttBtA.png" alt="GymLeader Workflow" width="71%">
</p>

#### 1.  From Vault to Arena
- We scan your connected wallet (**Beezie** or **CollectorCrypt**) to verify ownership, card grading, and stats.

#### 2.  Metadata Reading
- After retrieving the player's card addresses, we gather additional data via the TCGdex API to enrich the information fed into the AI.

#### 3. Gym Generation
- Players create their own Gym by combining their Pokémon cards with their unique creativity. The AI Agent processes this information to generate the visuals and atmosphere of the Gym.

#### 4. Battle (Agent Judge)
- When a player initiates a battle, the AI Agent acts as the Judge, Gym Leader, and Narrator, creating a seamless and immersive combat experience.

#### 5. Rewards
- Upon winning a battle, the player is rewarded with a unique badge, immortalizing their victory.

## 🔧 Technologies
<p align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=js,react,tailwind,vercel,cloudflare,firebase" />
  </a>
</p>

<details>
  <summary><b>Click to view the full tech stack 🧰 </b></summary>
  <ul>
    <li><strong>Frontend:</strong> JavaScript, React, Tailwind CSS</li>
    <li><strong>Backend:</strong> Vercel Functions, Cloudflare Workers</li>
    <li><strong>Database & Infrastructure:</strong> Firebase, ImgBB</li>
    <li><strong>Authentication:</strong> Firebase, Solana Wallet, Reown</li>
    <li><strong>IA:</strong> LLM, Gemini)</li>
    <li><strong>Blockchain:</strong> Moralis, Solana, Flow EVM</li>
  </ul>
</details>

## 💿 Installation
<details>
  <summary><strong>Step 1 - ✅ Requirements</strong></summary>

#### 
  Before you begin, make sure you have __installed__:  
  - Node.js - **[click here](https://nodejs.org/)**
  - Vercel CLI - **[click here](https://vercel.com/docs/cli)**  

  And __have an account__ on the following platforms: 
  - Firebase - **[click here](https://firebase.google.com/)**, 
  - Cloudflare - **[click here](https://dash.cloudflare.com/sign-up/workers-and-pages)**,
  - Moralis - **[click here](https://moralis.com/)**,
  - ReOwn - **[click here](https://reown.com/)**, 
  - ImgBB - **[click here](https://imgbb.com/)** 
#### 

</details>

<details>
  <summary><strong>Step 2 - 🔑 Environment Configuration</strong></summary>

#### 
  - Rename the `.env.example` files to `.env` in the following folders:

    ```
    /backend
    /web
    ```  
  - Then, open each `.env` file and fill in the environment variables as indicated in the comments.
#### 

</details>

<details>
  <summary><strong>Step 3 - 📦 Install Dependencies</strong></summary>

#### 
  - Inside each of the folders below:  

    ```
    /backend
    /web
    ```  
  - run the command:  

    ```bash
    npm install
    ```
#### 

</details>


<details>
  <summary><strong><b>Step 4</b> - 🚀 Running the Project</strong></summary>
  
#### ⚡ Backend - [http://localhost:3000](http://localhost:3000)  

```bash
cd backend
vercel dev
```

#### 💻 Frontend - [http://localhost:5173](http://localhost:5173)  

```bash
cd web
npm run dev
```
</details>

## 🐞 Report Bug and Errors  
Found a bug or encountered an error? We'd love to help! Here’s how you can get support:

**Create a GitHub Issue**  
- For well-defined bugs, errors, or feature requests, creating an issue is the best way to ensure it gets tracked and addressed by the team.  
  ➡️ **[Create a new issue here](https://github.com/lumitylabs/gymleader/issues/new)**

**Ask on our Discord**  
- If you're not sure if it's a bug, have a quick question, or want to discuss the issue first, our community on Discord is the perfect place.  
  ➡️ **[Join the discussion on Discord](https://discord.com/channels/1174034150462861324/1444561443377909802)**

## 📧 Contact
If you have any questions or suggestions,  please feel free to contact us. : )

| Contact | Luciano Barros |
| ------ | ------ |
| Discord | @lucianofbn |
| Email | lucianofbn@lumitylabs.com |
| 𝕏 | @lucianofbn |

| Contact | Rafael Souza | 
| ------ | ------ |
| Discord | @rafaelsouza |
| Email | rafaelsouza@lumitylabs.com |
| 𝕏 | @rafaelszc |

<br><br>

<p align="center">
  <i>Powered by </i><b><a href="https://www.lumitylabs.com">Lumity</a>💫</b>
</p>

