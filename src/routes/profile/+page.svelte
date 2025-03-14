<script>
    let user = {
      name: "ユキ",
      level: 12,
      avatar: "https://cdn.discordapp.com/attachments/1339551213045288991/1350114889930379314/B2E575C6-D0FB-4585-BA0B-A83D1195AB8C.jpg?ex=67d58ff9&is=67d43e79&hm=5664853584ff3d645e9374fd317ff86d45341e24ce85e58e3de926cef4e50074&",
      comment: "",
      sections: [
        { title: "クエスト", items: 3 },
        { title: "クイズ", items: 3 },
        { title: "地域", items: 3 },
    { title: "キャラ", items: 3 } 
  ]
};

let editing = false;
    let newComment = user.comment;

    function saveComment() {
        user.comment = newComment;
        editing = false;
    };
</script>
  
<style>
    :global(body) {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100vh;
    }

    .profile {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 100vh;
        padding: 20px;
        background-color: blueviolet;
    }

    .top-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
        margin-bottom: 30px;
    }

    .user-info {
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 40px;
        font-weight: bold;
    }

    .avatar {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        object-fit: cover;
        text-align: right;
    }

    .sections-container {
        align-self: flex-end;
         margin-bottom: 40px;
    }
     .box {
      background: rgb(128, 128, 128);
      height: 30px;
      width: 100%;
        border-radius: 4px;  
    }
       .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 10px;
        width: 100%;
    }
.section div:first-child {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 10px;
        color: white; 
}
 .user-comment {
        font-size: 16px;
        color: white;
        margin-top: 10px;
        cursor: pointer;
        padding: 5px;
    }

    .comment-input {
        font-size: 16px;
        padding: 5px;
        border-radius: 4px;
        border: none;
        width: 200px;
        margin-top: 10px;
    }
</style>

<div class="profile">
    <div class="top-content">
        <div class="user-info">
            <span>{user.name}</span>
            <span>lv.{user.level}</span>
            {#if editing}
                <input 
                    class="comment-input"
                    bind:value={newComment}
                    placeholder="一言コメントを入力"
                    on:blur={saveComment}
                    on:keydown={(e) => e.key === 'Enter' && saveComment()}
                />
            {:else}
                <div class="user-comment" 
                    on:click={() => editing = true} 
                    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (editing = true)}
                    role="button"
                    tabindex="0">
                    {user.comment || "クリックしてコメントを追加"}
                </div>
            {/if}
        </div>
        <img src={user.avatar} alt="アバター" class="avatar" />
    </div>
    
    <div class="sections-container">
        {#each user.sections as section}
            <div class="section">
                <div>{section.title}</div>
                <div class="grid">
                    {#each Array(section.items) as _, i}
                        <div class="box"></div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>