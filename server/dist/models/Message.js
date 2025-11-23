"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const segmentSchema = new mongoose_1.default.Schema({
    type: {
        type: String,
        enum: ['text', 'hashtag', 'mention'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false,
    },
}, { _id: false });
const messageSchema = new mongoose_1.default.Schema({
    conversationId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    type: {
        type: String,
        enum: ['user', 'bot'],
        required: true,
        default: 'user',
    },
    content: {
        type: String,
        required: true,
    },
    segments: {
        type: [segmentSchema],
        default: [],
    },
    currentText: {
        type: String,
        default: '',
    },
    timestamp: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
exports.default = mongoose_1.default.model('Message', messageSchema);
