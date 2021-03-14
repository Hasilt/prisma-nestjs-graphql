import { parseFieldMeta } from '../helpers/parse-field-meta';
import { DMMF, EventArguments, Field } from '../types';

export function modelData(model: DMMF.Model, args: EventArguments) {
    const { modelNames, models, modelFields } = args;
    modelNames.push(model.name);
    models.set(model.name, model);

    const modelFieldsValue = new Map<string, Field>();
    modelFields.set(model.name, modelFieldsValue);
    for (const field of model.fields) {
        modelFieldsValue.set(field.name, {
            ...field,
            ...parseFieldMeta(field.documentation || ''),
        });
    }
}
