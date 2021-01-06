// this is how they are stored in database

let db = {
    user: [{
        userId: 'hghjg23hg213gjkk',
        email: 'user@gmail.com',
        handle: 'user',
        createdAt: '2020-07-16T01:57:10.012Z',
        bio: 'IM keme askdjkajsdjas',
        website: 'google.com',
        location: 'cavite ph'
    }],
    posts: [{
        userHandle: 'user',
        body: 'post content',
        createdAt: '2020-07-16T01:57:10.012Z',
        likeCount: 'count=5',
        commentCount: 'count=5'
    }],
    comments: [{
        userHandle: 'user',
        postId: '2134sdasdasdqwqwe',
        body: 'hello im comment',
        createdAt: '2020-07-16T01:57:10.012Z'
    }],
    notifications: [{
        recipient: 'user',
        sender: 'user2',
        read: 'true | false',
        postId: 'Jhd8620KDY',
        type: 'like | comment',
        createdAt: '2020-07-16T01:57:10.012Z'
    }]
    
}

const userDetails = {
    // redux data
    credentials: {
        userId: 'hghjg23hg213gjkk',
        email: 'user@gmail.com',
        handle: 'user',
        createdAt: '2020-07-16T01:57:10.012Z',
        bio: 'IM keme askdjkajsdjas',
        website: 'google.com',
        location: 'cavite ph'
    },
    likes: [
        {
            userHandle: 'user',
            postId: 'asdJHdweijJDShu23JKDJ'
        },
        {
            userHandle: 'user',
            postId: 'ksjdkajKJSDKwiji'
        }
    ]
}