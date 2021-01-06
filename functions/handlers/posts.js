const { db } = require('../util/admin');

exports.getAllPosts = ( req, res) => {
    db
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
        let posts = [];
        data.forEach(doc => {
            posts.push({
                postId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
                userImage: doc.data().userImage
            });
        });
        return res.json(posts);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
}

//createOnePost
exports. createPost = (req, res) => {
    const newPost = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };
    db
    .collection('posts')
    .add(newPost)
    .then(doc => {
        const resPost = newPost;
        resPost.postId = doc.id;
        res.json({resPost})
    })
    .catch( err => {
        res.status(500).json({error: "something went wrong"})
        console.error(err);
    })
}

//fetch one post
exports.getPost = ( req, res ) => {
    let postData = {};
    db.doc(`/posts/${req.params.postId}`).get()
        .then(doc => {
            if(!doc.exists) {
                return res.status(404).json({ error: 'Post not found'})
            }
            postData = doc.data();
            postData.postId = doc.id;
            return db
            .collection('comments')
            .orderBy('createdAt', 'desc')
            .where('postId', '==', req.params.postId)
            .get();
        })
        .then(data => {
            postData.comments = [];
            data.forEach(doc => {
                postData.comments.push(doc.data());
            });
            return res.json(postData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code});
        })
};
//comment on a post so ung comment is hiwalay hndi sya child ng post kase 
//4mb lng kaya ng isang document so pag madame comment baka mag crash at mggng slow

exports.commentOnPost = ( req, res ) => {
    if( req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty'});

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        postId: req.params.postId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };
    
    //this confirms if the post exists bka kase wala na
    //get the post
    db.doc(`/posts/${req.params.postId}`).get()
    .then(doc => {
        if(!doc.exists) {
            return res.status(404).json({ error: 'Post not found'});
        }
        return doc.ref.update({ commentCount: doc.data().commentCount +1});
    })
    .then(() => {
        return db.collection('comments').add(newComment);//adds the comment or add a document in db firebase
    })
    .then(() => {
        res.json(newComment);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong'});
    })
}

//like a post
exports.likePost = ( req, res) => {
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle) //protected this means u have access to that user or handle
    .where('postId', '==', req.params.postId).limit(1);//query needs to limit to 1 

    const postDocument = db.doc(`/posts/${req.params.postId}`);

    let postData = {};

    postDocument.get()
        .then(doc => {
            if(doc.exists){
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Post not found '});
            }
        })
        .then(data => {
            if(data.empty){
                return db.collection('likes').add({
                    postId: req.params.postId,
                    userHandle: req.user.handle
                })
                .then(() => { //child or nest to avoid even if its empty will go in
                    postData.likeCount++;
                    return postDocument.update({ likeCount: postData.likeCount }); //pass increament like
                })
                //here above codes succeed
                .then(() => {
                    return res.json(postData);
                })
            } else {
                return res.status(400).json({ error: 'Post already like'})
            }
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({ error: err.code });
        })
    };

//unlike
exports.unlikePost = ( req, res) => {
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle) //protected this means u have access to that user or handle
    .where('postId', '==', req.params.postId).limit(1);//query needs to limit to 1 

    const postDocument = db.doc(`/posts/${req.params.postId}`);

    let postData;

    postDocument
        .get()
        .then(doc => {
            if(doc.exists){
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Post not found '});
            }
        })
        .then(data => {
            if(data.empty) {
                return res.status(400).json({ error: 'Post not liked'});
            } else {
                return db
                    .doc(`/likes/${data.docs[0].id}`)
                    .delete()
                    .then(() => {
                        postData.likeCount--;
                        return postDocument.update({ likeCount: postData.likeCount });
                    })
                    .then(() => {
                        res.json(postData);
                    })
                }
            })
            .catch(err => {
                console.error(err)
                res.status(500).json({ error: err.code });
            })
        }

//delete post
exports.deletePost = ( req, res ) => {
    const document = db.doc(`/posts/${req.params.postId}`); //reference
    document.get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Post not found'})
            }
            if(doc.data().userHandle !== req.user.handle){
                return res.status(403).json({ error: "UnAuthorized"});
            } else {
                return document.delete();
            }
        })
        .then(() => {
            res.json({ message: "Post deleted succesfully"})
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        })
    }

