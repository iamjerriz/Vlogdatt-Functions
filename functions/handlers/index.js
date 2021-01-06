const functions = require('firebase-functions');
const app = require('express')();

const cors = require('cors');
app.use(cors());

const { db } = require('./util/admin');

const FBAuth = require('./util/fbAuth')

//post
const { getAllPosts } = require('./handlers/posts');
const { createPost } = require('./handlers/posts');
const { deletePost } = require('./handlers/posts');

//comment
const { getPost } = require('./handlers/posts');
const { commentOnPost } = require('./handlers/posts');

//like unlike delete
const { likePost } = require('./handlers/posts');
const { unlikePost } = require('./handlers/posts');

const { signup, 
    login, 
    uploadImage, 
    addUserDetails, 
    getAuthenticatedUser,
    markNotificationsRead,
    getUserDetails
     } = require('./handlers/users');
// const { onUpdate } = require('firebase-functions');
// const { config } = require('firebase-functions');

//post routes
app.get('/posts', getAllPosts);
app.post('/post', FBAuth, createPost);
app.delete('/post/:postId', FBAuth, deletePost)

//comments
app.get('/post/:postId', getPost);
app.post('/post/:postId/comment', FBAuth, commentOnPost)

//like unlike delete
app.get('/post/:postId/like', FBAuth, likePost)
app.get('/post/:postId/unlike', FBAuth, unlikePost)

//signup login user routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

//get user details
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.region('asia-northeast1').https.onRequest(app);

// like notification
exports.createNotificationOnLike = functions
    .region('asia-northeast1')
    .firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        return db
            .doc(`/posts/${snapshot.data().postId}`)
            .get()
            .then((doc) =>{
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) { //checks if the doc exist and the user is the current user
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        postId: doc.id
                    })
                }
            })
            .catch((err) => console.error(err));
    });

//unlike delete notification
exports.deleteNotificationOnUnLike = functions.region('asia-northeast1').firestore.document('likes/{id}')
    .onDelete((snapshot) => {
       return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.error(err);
                return;
            });
    });

//comment notification
exports.createNotificationOnComment = functions.region('asia-northeast1').firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/posts/${snapshot.data().postId}`).get()
            .then(doc =>{
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        postId: doc.id
                    })
                }
            })
            .catch(err => {
                console.error(err);
                return;
            });
    });

exports.onUserImageChange = functions.region('asia-northeast1').firestore.document('/users/{id}')
    .onUpdate((change) => {
        console.log(change.before.data());//before image change
        console.log(change.after.data());//after

        if(change.before.data().imageUrl !== change.after.data().imageUrl) {
            console.log('image has changed')
            const batch = db.batch(); // updates multiple document in db
            return db.collection('posts').where('userHandle', '==', change.before.data().handle).get()
                .then((data) => {
                    data.forEach(doc => {
                        const post = db.doc(`posts/${doc.id}`);
                        batch.update(post, { userImage: change.after.data().imageUrl});
                    })
                    return batch.commit();
                })
        } else return true;
    });

exports.onPostDelete = functions.region('asia-northeast1').firestore.document('/posts/{postId}')
    .onDelete((snapshot, context) => {
        const postId = context.params.postId;
        const batch = db.batch();
        return db
        .collection('comments').where('postId', '==', postId).get()
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('postId', '==', postId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('postId', '==', postId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
            })
            .catch(err => console.error(err));
    })