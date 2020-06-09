import Joi from '@hapi/joi';

export const validation = {
    String: Joi.string(),
    StringArray: Joi.array().items(Joi.string()),

    ClientAction: Joi.object({
        type: Joi.string().required(),
        payload: Joi.any().required()
    }),

    ClientRequest: Joi.object({
        id: Joi.string().required(),
        data: Joi.any().required(),
        type: Joi.string().required()
    }),

    ClientSettings: Joi.object({
        reusableDownloadKeys: Joi.boolean().optional(),
        strictSession: Joi.boolean().optional(),
        allowStreaming: Joi.boolean().optional()
    }),

    FileListSchema: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        size: Joi.number().required()
    }))
};
