import mongoose from '../mongo.js';

const NodeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    selected: { type: Boolean, default: false }
}, { _id: false });

const EdgeSchema = new mongoose.Schema({
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String },
    animated: { type: Boolean, default: false },
    label: { type: String },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const CanvasSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    chain: { type: String, default: 'ethereum' },
    case_id: { type: String, default: null },
    nodes: [NodeSchema],
    edges: [EdgeSchema],
    viewport: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        zoom: { type: Number, default: 1 }
    },
    ai_suggestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

CanvasSchema.pre('save', function () {
    this.updated_at = Date.now();
});

export const Canvas = mongoose.model('Canvas', CanvasSchema);
