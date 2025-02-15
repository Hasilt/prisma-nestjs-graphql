import { ArgsType, Field, Int } from '@nestjs/graphql';

import { CommentCountAggregateInput } from './comment-count-aggregate.input';
import { CommentMaxAggregateInput } from './comment-max-aggregate.input';
import { CommentMinAggregateInput } from './comment-min-aggregate.input';
import { CommentOrderByWithRelationInput } from './comment-order-by-with-relation.input';
import { CommentWhereInput } from './comment-where.input';
import { CommentWhereUniqueInput } from './comment-where-unique.input';

@ArgsType()
export class AggregateCommentArgs {
    @Field(() => CommentWhereInput, { nullable: true })
    where?: CommentWhereInput;

    @Field(() => [CommentOrderByWithRelationInput], { nullable: true })
    orderBy?: Array<CommentOrderByWithRelationInput>;

    @Field(() => CommentWhereUniqueInput, { nullable: true })
    cursor?: CommentWhereUniqueInput;

    @Field(() => Int, { nullable: true })
    take?: number;

    @Field(() => Int, { nullable: true })
    skip?: number;

    @Field(() => CommentCountAggregateInput, { nullable: true })
    count?: CommentCountAggregateInput;

    @Field(() => CommentMinAggregateInput, { nullable: true })
    min?: CommentMinAggregateInput;

    @Field(() => CommentMaxAggregateInput, { nullable: true })
    max?: CommentMaxAggregateInput;
}
